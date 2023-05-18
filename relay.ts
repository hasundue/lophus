import { Notify } from "https://deno.land/x/async@v2.0.2/notify.ts";
import { Event as NostrEvent, Filter } from "npm:nostr-tools@1.10.1";
import { Brand, noop } from "./lib/utils.ts";
import { log } from "./lib/log.ts";
import { RelayUrl, WebSocketEventListner } from "./lib/types.ts";

export interface RelayConfig {
  name?: string;
  url: RelayUrl;
  read?: boolean;
  write?: boolean;
  on?: RelayToClientEventListener;
  close_on_eose?: boolean;
}

export type RelayToClientEventListener = Partial<
  & WebSocketEventListner
  & RelayToClientMessageListener
>;

export class Relay {
  #ws: WebSocket;
  readonly name: string;
  readonly #notifier = new Notify();
  readonly #subscriptions = new Map<SubscriptionId, SubscriptionProvider>();

  constructor(public readonly config: RelayConfig) {
    this.#ws = this.connect();
    this.name = this.config.name ?? this.config.url;
  }

  connect(): WebSocket {
    const ws = new WebSocket(this.config.url);

    ws.onopen = (event) => {
      log.info("connection opened", this.name);
      this.config.on?.open?.call(this, event);
      this.#notifier.notify();
    };

    ws.onclose = (event) => {
      log.info("connection closed", this.name);
      (event.code === 1000 ? log.debug : log.error)(event);
      this.config.on?.close?.call(this, event);
      this.#notifier.notify();
    };

    ws.onerror = (event) => {
      log.error("connection error", this.name);
      this.config.on?.error?.call(this, event);
    };

    ws.onmessage = (ev: MessageEvent<string>) => {
      log.debug(ev.data);
      const msg = JSON.parse(ev.data) as RelayToClientMessage;
      try {
        switch (msg[0]) {
          case "EVENT": {
            const [, sid, event] = msg;
            this.config.on?.event?.call(this, sid, event);
            this.#subscription(sid)?.write(event);
            break;
          }
          case "EOSE": {
            const [, sid] = msg;
            this.config.on?.eose?.call(this, sid);
            if (this.config.close_on_eose) {
              this.#subscription(sid)?.close();
            }
            break;
          }
          case "NOTICE": {
            const [, message] = msg;
            this.config.on?.notice?.call(this, message);
            break;
          }
          default:
            log.warning("Unknown message type:", msg[0]);
        }
      } catch (err) {
        log.error(err);
      }
    };
    return ws;
  }

  close() {
    this.#subscriptions.forEach((sub) => sub.close());
    this.#ws.close();
  }

  async ensureOpen(onopen: (relay: Relay) => void = noop) {
    switch (this.#ws.readyState) {
      case WebSocket.CONNECTING:
        await this.#notifier.notified();
        onopen(this);
        /* falls through */

      case WebSocket.OPEN:
        return;

      case WebSocket.CLOSING:
        await this.#notifier.notified();
        /* falls through */

      case WebSocket.CLOSED:
        this.#ws = this.connect();
        await this.#notifier.notified();
        onopen(this);
    }
  }

  async send(message: ClientToRelayMessage) {
    await this.ensureOpen();
    this.#ws.send(JSON.stringify(message));
    log.debug("Sent", message, this.name);
  }

  subscribe(filter: Filter, options: SubscribeOptions = {}): Subscription {
    const sub = new SubscriptionProvider(filter, options, this);
    this.#subscriptions.set(sub.id, sub);
    return sub;
  }

  unsubscribe(id: SubscriptionId) {
    this.#subscriptions.delete(id);
  }

  #subscription(id: SubscriptionId) {
    const sub = this.#subscriptions.get(id);
    if (!sub) {
      log.warning("Unknown subscription", id);
      this.send(["CLOSE", id]);
    }
    return sub;
  }
}

//
// Subscription and SubscriptionProvider
//
export interface SubscribeOptions {
  id?: string;
}

export interface Subscription {
  readonly filter: Filter;
  readonly options: SubscribeOptions;
  readonly stream: ReadableStream<NostrEvent>;
}

class SubscriptionProvider extends TransformStream<NostrEvent, NostrEvent> {
  readonly id: SubscriptionId;
  #relays: Set<Relay>;
  #recieved: Set<NostrEvent["id"]>;

  constructor(
    public readonly filter: Filter,
    public readonly options: SubscribeOptions,
    ...relays: Relay[]
  ) {
    super({
      transform: (event, controller) => {
        if (!this.#recieved.has(event.id)) {
          this.#recieved.add(event.id);
          controller.enqueue(event);
        }
      },
      flush: () => {
        log.debug("Subscription closed", this.id);
      },
    });

    this.id =
      (options.id ?? Math.random().toString().slice(2)) as SubscriptionId;

    this.#relays = new Set(relays);
    this.#recieved = new Set();

    this.#relays.forEach((relay) => this.#request(relay));
  }

  #request(relay: Relay) {
    relay.send(["REQ", this.id, this.filter]);
  }

  close() {
    this.#relays.forEach((relay) => {
      relay.send(["CLOSE", this.id]);
      relay.unsubscribe(this.id);
    });
  }

  async write(event: NostrEvent) {
    const writer = this.writable.getWriter();

    await writer.ready;
    await writer.write(event).catch(log.error);

    await writer.ready;
    writer.releaseLock();
  }

  get stream() {
    return this.readable;
  }
}

//
// Types
//
type RelayToClientMessageListener = {
  "event": (id: SubscriptionId, event: NostrEvent) => void;
  "eose": (id: SubscriptionId) => void;
  "notice": (message: string) => void;
};

type RelayToClientMessage =
  | ["EVENT", SubscriptionId, NostrEvent]
  | ["EOSE", SubscriptionId, ...Filter[]]
  | ["NOTICE", string];

type ClientToRelayMessage =
  | ["EVENT", NostrEvent]
  | ["REQ", SubscriptionId, ...Filter[]]
  | ["CLOSE", SubscriptionId];

type SubscriptionId = Brand<string, "SubscriptionId">;
