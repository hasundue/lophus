import { log } from "./lib/log.ts";
import { Notify } from "https://deno.land/x/async@v2.0.2/notify.ts";
import { Event as NostrEvent, Filter } from "npm:nostr-tools@1.10.1";
import { RelayUrl } from "./lib/types.ts";
import { Brand, noop, now } from "./lib/utils.ts";

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

interface SubscribeOptions {
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

export class Relay {
  #ws: WebSocket;
  readonly name: string;
  readonly #notifier = new Notify();
  readonly #subscriptions = new Map<SubscriptionId, SubscriptionProvider>();

  constructor(public readonly config: RelayConfig) {
    this.name = this.config.name ?? this.config.url;
    this.#ws = this.connect();
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

    ws.onmessage = async (ev: MessageEvent<string>) => {
      log.debug(ev.data);
      const msg = JSON.parse(ev.data) as RelayToClientMessage;
      try {
        switch (msg[0]) {
          case "EVENT": {
            const [, sid, event] = msg;
            if (this.config.on?.event) this.config.on.event(sid, event);

            const sub = this.#subscriptions.get(sid);
            if (!sub) {
              log.warning("Unknown subscription", event);
              this.send(["CLOSE", sid]);
              break;
            }
            await sub.write(event);
            break;
          }
          case "EOSE": {
            const [, sid] = msg;
            this.config.on?.eose?.call(this, sid);

            if (this.config.close_on_eose) {
              this.close();
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
}

type WebSocketEventType = Omit<WebSocketEventMap, "message">;

type WebSocketEventListner = {
  [K in keyof WebSocketEventType]: (event: WebSocketEventMap[K]) => void;
};

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

export class RelayPool {
  private relays: Relay[];

  constructor(relays: RelayConfig[]) {
    this.relays = relays.map((config) => new Relay(config));
  }

  connect(relays: RelayConfig) {
    this.relays.push(new Relay(relay));
  }

  private async reconnect(relay: Relay) {
    await relay.reconnect();
    // Restart all subscriptions to the relay.
    if (relay.read) {
      this.subs.forEach((sub) => sub.restart(relay));
    }
  }

  subscribe(filter: Filter, options?: SubscribeOptions) {
    return new SubscriptionProvider(
      this.relays.filter((conn) => conn.read),
      { since: now(), ...filter },
      options,
    );
  }

  retrieve(filter: Filter, options?: SubscribeOptions) {
    const sub = new SubscriptionProvider(
      this.relays.filter((conn) => conn.read),
      filter,
      { close_on_eose: true, ...options },
    );
    return sub.stream;
  }

  async getLatest(filter: Filter): Promise<Event | null> {
    const sub = new SubscriptionProvider(
      this.relays.filter((conn) => conn.read),
      { limit: 1, ...filter },
      { close_on_eose: true },
    );
    for await (const event of sub.stream) {
      return event;
    }
    return null;
  }

  async publish(event: Event) {
    const env = Deno.env.get("RAILWAY_ENVIRONMENT");

    if (env !== "production") {
      console.log(`Skipped publishing (env: ${env}).`);
      return;
    }

    await Promise.all(
      this.relays.filter((conn) => conn.write).map(async (relay) => {
        if (!relay.connected) {
          console.assert(
            !relay.read,
            "Non write-only relay is left disconnected:",
            relay.url,
          );
          await this.reconnect(relay);
        }

        const sub = this.subscribe({ ids: [event.id] });
        const pub = relay.publish(event);

        pub.on("failed", (reason: string) => {
          console.error(
            `Failed to publish an event ${event.id} to ${relay.url}:`,
            { cause: reason },
          );
        });

        // Wait for the event to be published.
        for await (const event of sub.stream) {
          console.log(
            `Event ${event.id} has been published to ${relay.url}.`,
          );
          return;
        }
      }),
    );
  }

  close() {
    this.relays.forEach((relay) => {
      relay.close();
    });
  }
}
