import type { Event as NostrEvent, Filter } from "npm:nostr-tools@1.10.1";
import { Notify } from "./lib/x/async.ts";
import { noop } from "./lib/utils.ts";
import type {
  Brand,
  Expand,
  ClientToRelayMessage,
  RelayToClientMessage,
  SubscriptionId,
  WebSocketEventListner,
  WebSocketUrl,
} from "./lib/types.ts";

//
// Relay and RelayProvider
//

export interface RelayConfig<
  R extends boolean = true,
  W extends boolean = true,
> {
  name?: string;
  url: WebSocketUrl;
  read?: R;
  write?: W;
  on?: Expand<RelayProvider<R, W>["on"]>;
}

export type RelayToClientEventListener =
  & WebSocketEventListner
  & RelayToClientMessageListener;

export type RelayToClientMessageListener = {
  "event": (id: SubscriptionId, event: NostrEvent) => void;
  "eose": (id: SubscriptionId) => void;
  "notice": (message: string) => void;
};

export type Relay<R extends boolean = true, W extends boolean = true> =
  & Pick<RelayProvider<R, W>, "name" | "url" | "on">
  & Pick<RelayProvider<R, W>, RelayProviderMethod<R, W>>;

export function connect<R extends boolean = true, W extends boolean = true>(
  relay: RelayConfig<R, W>,
) {
  // @ts-ignore: TS2322 Difficult to use generics for methods of RelayProvider
  return new RelayProvider<R, W>(relay) as Relay<R, W>;
}

type RelayUrl = Brand<WebSocketUrl, "RelayUrl">;

type ReadRelayMethod = "subscribe" | "unsubscribe";
type WriteRelayMethod = "send" | "writable";

type RelayProviderMethod<R, W> = R extends true
  ? W extends true ? ReadRelayMethod | WriteRelayMethod : ReadRelayMethod
  : W extends true ? WriteRelayMethod
  : never;

class RelayProvider<R extends boolean, W extends boolean> {
  readonly name: string;
  readonly url: RelayUrl;
  readonly on: Partial<RelayToClientEventListener>;
  readonly writable: WritableStream<NostrEvent>;

  #ws: WebSocket;
  readonly #notifier = new Notify();
  readonly #subscriptions = new Map<SubscriptionId, SubscriptionProvider>();

  constructor(config: RelayConfig<R, W>) {
    this.url = config.url as RelayUrl;
    this.name = config.name ?? config.url;
    this.on = config.on ?? {};
    this.#ws = this.connect();

    this.writable = new WritableStream({
      write: (event: NostrEvent) => {
        this.send(["EVENT", event]);
      },
    });
  }

  connect(): WebSocket {
    const ws = new WebSocket(this.url);

    ws.onopen = (event) => {
      console.assert(this.#ws.readyState === WebSocket.OPEN);
      this.on.open?.call(this, event);
      this.#notifier.notifyAll();
    };

    ws.onclose = (event) => {
      if (event.code > 1000) console.error(event);
      this.on.close?.call(this, event);
      this.#notifier.notifyAll();
    };

    ws.onerror = (event) => {
      console.error("Error", this.name);
      this.on.error?.call(this, event);
    };

    ws.onmessage = (ev: MessageEvent<string>) => {
      const msg = JSON.parse(ev.data) as RelayToClientMessage;
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
        default: {
          console.warn("Unknown message type:", msg[0]);
        }
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
          break;

        case WebSocket.CLOSING:
          await this.#notifier.notified();
          /* falls through */
        case WebSocket.CLOSED:
          this.#ws = this.connect();
          await this.#notifier.notified();
          break;
      }
    })();
  }

  async ensureReady(onReady: (relay: this) => void = noop) {
    const initial = this.#ws.readyState;
    await this.ready;
    if (initial > WebSocket.OPEN) onReady(this);
  }

  async send(message: ClientToRelayMessage) {
    await this.ready;
    this.#ws.send(JSON.stringify(message));
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
      console.warn("Unknown subscription", id);
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
  #relays: Set<RelayProvider<true, boolean>>;
  #recieved: Set<NostrEvent["id"]>;

  constructor(
    public readonly filter: Filter,
    public readonly options: SubscribeOptions,
    ...relays: Relay<true, boolean>[]
  ) {
    this.id =
      (options.id ?? Math.random().toString().slice(2)) as SubscriptionId;

    this.#relays = new Set(relays) as Set<RelayProvider<true, boolean>>;
    this.#recieved = new Set();

    this.#readable = new ReadableStream<NostrEvent>({
      start: (controller) => {
        this.#controller = controller;
        this.#notifier.notify();
      },
      pull: () => {
        this.#relays.forEach((relay) => relay.ensureReady(this.request));
      },
      cancel: () => {
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
    await writer.write(event).catch(console.error);

    await writer.ready;
    writer.releaseLock();
  }

  get events() {
    return this.#readable;
  }
}
