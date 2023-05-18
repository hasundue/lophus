import type { Event as NostrEvent, Filter } from "npm:nostr-tools@1.10.1";
import { Notify } from "./lib/async.ts";
import { anyof, Expand, log, noop } from "./lib/utils.ts";
import type {
  ClientToRelayMessage,
  RelayToClientMessage,
  RelayUrl,
  SubscriptionId,
  WebSocketEventListner,
  WebSocketUrl,
} from "./types.ts";

const { debug, error, info, warn } = log;

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
      info("Connection opened", this.name);
      this.on.open?.call(this, event);
      this.#notifier.notify();
    };

    ws.onclose = (event) => {
      info("Connection closed", this.name);
      (event.code === 1000 ? debug : error)(event);
      this.on.close?.call(this, event);
      this.#notifier.notify();
    };

    ws.onerror = (event) => {
      error("Connection error", this.name);
      this.on.error?.call(this, event);
    };

    ws.onmessage = (ev: MessageEvent<string>) => {
      const msg = JSON.parse(ev.data) as RelayToClientMessage;
      debug(msg);
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
            warn("Unknown message type:", msg[0]);
        }
      } catch (err) {
        error(err);
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
          debug("CONNECTING", this.name);
          await this.#notifier.notified();
          /* falls through */
        case WebSocket.OPEN:
          debug("OPEN", this.name);
          return;

        case WebSocket.CLOSING:
          debug("CLOSING", this.name);
          await this.#notifier.notified();
          /* falls through */
        case WebSocket.CLOSED:
          debug("CLOSED", this.name);
          this.#ws = this.connect();
          await this.#notifier.notified();
          return;
      }
    })();
  }

  async ensureReady(onReady: (relay: this) => void = noop) {
    await this.ready;
    debug("Ready", this.name);
    onReady(this);
  }

  async send(message: ClientToRelayMessage) {
    await this.ready;
    const str = JSON.stringify(message);
    this.#ws.send(str);
    debug(message);
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
      warn("Unknown subscription", id);
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

class SubscriptionProvider {
  readonly id: SubscriptionId;

  readonly #readable: ReadableStream<NostrEvent>;
  readonly #writable: WritableStream<NostrEvent>;
  readonly #notifier = new Notify();
  #controller?: ReadableStreamDefaultController<NostrEvent>;
  #relays: Set<Relay>;
  #recieved: Set<NostrEvent["id"]>;

  constructor(
    public readonly filter: Filter,
    public readonly options: SubscribeOptions,
    ...relays: Relay[]
  ) {
    this.#readable = new ReadableStream<NostrEvent>({
      start: (controller) => {
        this.#controller = controller;
        this.#notifier.notify();
      },
      pull: async () => {
        debug("Pull", this.id);
        await anyof(this.#relays, async (relay) => {
          await relay.ensureReady(this.request);
        });
      },
      cancel: () => {
        debug("Close", this.id);
        this.close();
      },
    });

    this.#writable = new WritableStream<NostrEvent>({
      start: async () => {
        if (!this.#controller) {
          await this.#notifier.notified();
        }
      },
      write: (event) => {
        if (!this.#recieved.has(event.id)) {
          this.#recieved.add(event.id);
          this.#controller!.enqueue(event);
        }
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
    const writer = this.#writable.getWriter();

    await writer.ready;
    await writer.write(event).catch(error);

    await writer.ready;
    writer.releaseLock();
  }

  get events() {
    return this.#readable;
  }
}
