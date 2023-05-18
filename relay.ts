import * as log from "https://deno.land/std@0.187.0/log/mod.ts";
import { Mutex } from "https://deno.land/x/async@v2.0.2/mod.ts";
import { Event as NostrEvent, Filter } from "npm:nostr-tools@1.10.1";
import { RelayUrl } from "./lib/types.ts";
import { Brand, now } from "./lib/utils.ts";

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

class SubscriptionProvider implements Subscription {
  readonly id: SubscriptionId;
  #relays: Set<Relay>;
  #recieved: Set<NostrEvent["id"]>;
  #writable: WritableStream<NostrEvent>;
  #readable: ReadableStream<NostrEvent>;

  constructor(
    public readonly filter: Filter,
    public readonly options: SubscribeOptions,
    ...relays: Relay[]
  ) {
    this.id =
      (options.id ?? Math.random().toString().slice(2)) as SubscriptionId;
    this.#relays = new Set(relays);
    this.#recieved = new Set();

    this.#writable = new WritableStream<NostrEvent>({
      write: (event) =>
        new Promise((resolve, reject) => {
          if (this.#recieved.has(event.id)) {
            reject();
          }
          this.#recieved.add(event.id);
          resolve();
        }),
    });

    this.#readable = new ReadableStream<NostrEvent>({
      pull: () => {
        this.#relays.forEach((relay) => relay.ensure(this.#start));
      },
    });

    this.#readable.pipeTo(this.#writable);
  }

  #start(relay: Relay) {
    relay.send(["REQ", this.id, this.filter]);
  }

  async write(event: NostrEvent) {
    await this.#writable.getWriter().write(event);
  }

  get stream() {
    return this.#readable;
  }
}

export class Relay {
  readonly #ws: WebSocket;
  #mutex: Mutex;
  #subscriptions: Map<SubscriptionId, SubscriptionProvider> = new Map();

  constructor(public readonly config: RelayConfig) {
    const name = config.name ?? config.url;

    this.#ws = new WebSocket(config.url);

    this.#ws.onopen = (event) => {
      log.info("connection opened", name);
      config.on?.open?.call(this, event);
    };

    this.#ws.onclose = (event) => {
      log.info("connection closed", name);
      (event.code === 1000 ? log.debug : log.error)(event);
      this.config?.on?.close?.call(this, event);
    };

    this.#ws.onerror = (event) => {
      log.error("connection error", name);
      this.config.on?.error?.call(this, event);
    };

    this.#ws.onmessage = (ev: MessageEvent<RelayToClientMessage>) => {
      try {
        switch (ev.data[0]) {
          case "EVENT": {
            log.debug("event recieved", ev.data);

            const [_, id, event] = ev.data;
            if (this.config.on?.event) this.config.on.event(id, event);

            const sub = this.#subscriptions.get(id);
            if (!sub) {
              log.warning("unknown subscription", event);
              break;
            }
            sub.write(event); // async
            break;
          }
          case "EOSE": {
            log.debug("Received eose:", ev.data);

            const [_, id] = ev.data;
            this.config.on?.eose?.call(this, id);

            if (config.close_on_eose) {
              this.close();
            }
            break;
          }
          case "NOTICE": {
            log.debug("Received notice:", ev.data);

            const [_, message] = ev.data;
            this.config.on?.notice?.call(this, message);

            break;
          }
        }
      } catch (e) {
        if (e instanceof TypeError) {
          console.error(
            "Received malformed message from relay:",
            config.url,
            ev.data,
          );
        } else throw e;
      }

      this.connect();
    };
  }

  connect() {
    this.#ws.open();
  }

  close() {
  }

  ensure(callback: (relay: Relay) => void) {
  }

  send(message: ClientToRelayMessage) {
    this.#ws.send(JSON.stringify(message));
  }

  subscribe(filter: Filter, options: SubscribeOptions = {}): Subscription {
    const sub = new SubscriptionProvider(filter, options);
    this.#subscriptions.set(sub.id, sub);
    return sub;
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
    await relay.connect();
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
