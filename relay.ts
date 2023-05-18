import * as log from "https://deno.land/std@0.187.0/log/mod.ts";
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

type SubscribeOptions = {
  id?: string;
  verb?: "REQ" | "COUNT";
  skipVerification?: boolean;
};

export interface Subscription {
  readonly filter: Filter;
  readonly options: SubscribeOptions;
  readonly stream: ReadableStream<NostrEvent>;
}

class SubscriptionProvider extends TransformStream<NostrEvent> {
  readonly id: SubscriptionId;

  constructor(
    private readonly ws: WebSocket,
    public readonly filter: Filter,
    public readonly options: SubscribeOptions,
  ) {
    super({
      transform: (event, controller) => {
        controller.enqueue(event);
      },
    });
    this.id =
      (options.id ?? Math.random().toString().slice(2)) as SubscriptionId;

    this.start();
  }

  start() {
    this.ws.send(JSON.stringify(["REQ", this.options.id, this.filter]));
  }

  /**
   * A helper method to deliver an event to the subscription.
   * It just wraps `this.writable.getWriter().write`.
   */
  deliver(event: NostrEvent) {
    this.writable.getWriter().write(event);
  }
}

export class Relay {
  private readonly ws: WebSocket;
  private readonly on: RelayToClientEventListener;
  private subscriptions: Map<SubscriptionId, SubscriptionProvider> = new Map();

  constructor(public readonly config: RelayConfig) {
    const name = config.name ?? config.url;

    this.ws = new WebSocket(config.url);
    this.on = config.on ?? {};

    this.ws.onopen = (event) => {
      log.info(`connected to ${name}`);
      config.on?.open?.call(this.ws, event);
    };

    this.ws.onclose = (event) => {
      log.info(`disconnected from ${name}`);
      (event.code === 1000 ? log.debug : log.error)(event);

      this.on.close?.call(this.ws, event);

      // We reconnect to write-only relays on demand.
      if (config.read) {
        log.info("reconnecting...");
        this.connect();
      }
    };

    this.ws.onerror = (event) => {
      log.error("connection error:", name);
      this.on.error?.call(this.ws, event);
    };

    this.ws.onmessage = (ev: MessageEvent<RelayToClientMessage>) => {
      try {
        switch (ev.data[0]) {
          case "EVENT": {
            log.debug("Received event:", ev.data);

            const [_, id, event] = ev.data;
            if (this.on.event) this.on.event(id, event);

            const sub = this.subscriptions.get(id);
            if (!sub) {
              log.warning("Received event for unknown subscription:", event);
              // TODO: stop the subscription
              break;
            }
            sub.deliver(event);
            break;
          }
          case "EOSE": {
            log.debug("Received eose:", ev.data);

            const [_, id] = ev.data;
            if (this.on.eose) this.on.eose(id);

            if (config.close_on_eose) this.ws.close();
            break;
          }
          case "NOTICE": {
            log.debug("Received notice:", ev.data);

            const [_, message] = ev.data;
            if (this.on.notice) this.on.notice(message);

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
    };
  }

  subscribe(filter: Filter, options: SubscribeOptions = {}) {
    const sub = new SubscriptionProvider(this.ws, filter, options);
    this.subscriptions.set(id, sub);
    return sub;
  }

  async connect() {
    await this.connected.lock(async (state) => {
      if (await state.get()) {
        console.warn("Already connected to", this.url);
        return;
      }
      this.relay.connect();
      this.notify.notified();

      await state.set(true);
    });
    console.log(`Connected to ${this.relay.url}.`);
    // this.subs.forEach((sub) => sub.start());
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
  | EventMessage
  | EoseMessage
  | NoticeMessage;

type EventMessage = ["EVENT", SubscriptionId, NostrEvent];
type EoseMessage = ["EOSE", SubscriptionId, ...Filter[]];
type NoticeMessage = ["NOTICE", string];

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
