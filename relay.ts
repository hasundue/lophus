import type { Event as NostrEvent, Filter } from "npm:nostr-tools@1.10.1";
import { Notify } from "./lib/async.ts";
import { Expand, log } from "./lib/utils.ts";
import type {
  ClientToRelayMessage,
  RelayToClientMessage,
  RelayUrl,
  SubscriptionId,
  WebSocketEventListner,
  WebSocketUrl,
} from "./types.ts";

export interface RelayConfig {
  name?: string;
  url: WebSocketUrl;
  read?: boolean;
  write?: boolean;
  on?: Expand<Relay["on"]>;
}

export type RelayToClientEventListener =
  & WebSocketEventListner
  & RelayToClientMessageListener;

export type RelayToClientMessageListener = {
  "event": (id: SubscriptionId, event: NostrEvent) => void;
  "eose": (id: SubscriptionId) => void;
  "notice": (message: string) => void;
};

export class Relay {
  readonly name: string;
  readonly url: RelayUrl;
  readonly read: boolean;
  readonly write: boolean;
  readonly on: Partial<RelayToClientEventListener>;

  #ws: WebSocket;
  readonly #notifier = new Notify();
  readonly #subscriptions = new Map<SubscriptionId, SubscriptionProvider>();

  constructor(config: RelayConfig) {
    this.url = config.url as RelayUrl;
    this.name = config.name ?? config.url;
    this.read = config.read ?? true;
    this.write = config.write ?? true;
    this.on = config.on ?? {};
    this.#ws = this.connect();
  }

  connect(): WebSocket {
    const ws = new WebSocket(this.url);

    ws.onopen = (event) => {
      log.info("Connection opened", this.name);
      this.on.open?.call(this, event);
      this.#notifier.notify();
    };

    ws.onclose = (event) => {
      log.info("Connection closed", this.name);
      (event.code === 1000 ? log.debug : log.error)(event);
      this.on.close?.call(this, event);
      this.#notifier.notify();
    };

    ws.onerror = (event) => {
      log.error("Connection error", this.name);
      this.on.error?.call(this, event);
    };

    ws.onmessage = (ev: MessageEvent<string>) => {
      const msg = JSON.parse(ev.data) as RelayToClientMessage;
      log.debug(msg);
      try {
        switch (msg[0]) {
          case "EVENT": {
            const [, sid, event] = msg;
            this.on.event?.call(this, sid, event);
            this.#subscription(sid)?.write(event);
            break;
          }
          case "EOSE": {
            const [, sid] = msg;
            this.on.eose?.call(this, sid);
            const sub = this.#subscription(sid);
            if (sub?.options.close_on_eose) sub.close();
            break;
          }
          case "NOTICE": {
            const [, message] = msg;
            this.on.notice?.call(this, message);
            break;
          }
          default:
            log.warn("Unknown message type:", msg[0]);
        }
      } catch (err) {
        log.error(err);
      }
    };

    this.#subscriptions.forEach((sub) => sub.request(this));

    return ws;
  }

  close() {
    this.#subscriptions.forEach((sub) => sub.close());
    this.#ws.close();
  }

  get ready(): Promise<void> {
    return (async () => {
      switch (this.#ws.readyState) {
        case WebSocket.CONNECTING:
          await this.#notifier.notified();
          /* falls through */
        case WebSocket.OPEN:
          return;

        case WebSocket.CLOSING:
          await this.#notifier.notified();
          /* falls through */
        case WebSocket.CLOSED:
          this.#ws = this.connect();
          await this.#notifier.notified();
          return;
      }
    })();
  }

  async send(message: ClientToRelayMessage) {
    await this.ready;
    const str = JSON.stringify(message);
    this.#ws.send(str);
    log.debug(str);
  }

  subscribe(filter: Filter, options: SubscribeOptions = {}): Subscription {
    if (!this.read) {
      throw new Error("Cannot subscribe to a write-only relay");
    }
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
      log.warn("Unknown subscription", id);
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
  close_on_eose?: boolean;
}

export interface Subscription {
  readonly filter: Filter;
  readonly options: SubscribeOptions;
  readonly events: ReadableStream<NostrEvent>;
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

    this.#relays.forEach((relay) => this.request(relay));
  }

  request(relay: Relay) {
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

  get events() {
    return this.readable;
  }
}
