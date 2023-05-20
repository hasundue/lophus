import { NostrNode, NostrEventListener } from "./mod.ts";
import {
  ClientToRelayMessage,
  Filter,
  RelayToClientMessage,
  RelayUrl,
  SignedEvent,
  SubscriptionId,
} from "./nips/01.ts";
import { Expand } from "./lib/types.ts";
import { noop, writeSafely } from "./lib/utils.ts";
import { Mutex, Notify } from "./lib/x/async.ts";

export * from "./nips/01.ts";

//
// Relay and RelayProvider
//
export type RelayConfig = {
  name?: string;
  url: RelayUrl;
  read?: boolean;
  write?: boolean;
  on?: Expand<NostrEventListener>;
};

class RemoteRelay
  implements NostrNode<RelayToClientMessage, ClientToRelayMessage> {
  // Websocket and its notifier for exclusive control
  #ws: WebSocket;
  readonly #ws_notifier = new Notify();

  // Readable end (incoming messages)
  read = true;
  readonly messages: ReadableStream<RelayToClientMessage>;

  // Writable end (outgoing messages)
  write = true;
  readonly writable: WritableStream<ClientToRelayMessage>;
  readonly #writer_mutex = new Mutex();

  // Subscriptions on this relay
  readonly #subscriptions = new Map<SubscriptionId, SubscriptionProvider>();

  constructor(private config: RelayConfig) {
    this.messages = new ReadableStream<RelayToClientMessage>({
      start: (controller) => {
        this.#ws.onmessage = (ev: MessageEvent<string>) => {
          const msg = JSON.parse(ev.data) as RelayToClientMessage;
          controller.enqueue(msg);
        };
      },
    });
    this.writable = new WritableStream<ClientToRelayMessage>({
      write: async (msg) => {
        await this.ws_ready;
        this.#ws.send(JSON.stringify(msg));
      },
      close: async () => {
        await this.ws_ready;
        this.#ws.close();
      },
    });
    this.url = config.url as RelayUrl;
    this.name = config.name ?? config.url;
    this.on = config.on ?? {};
    this.#ws = this.connect();
  }

  connect(): WebSocket {
    const ws = new WebSocket(this.url);

    ws.onopen = (event) => {
      this.on.open?.call(this, event);
      this.#ws_notifier.notifyAll();
    };

    ws.onclose = (event) => {
      if (event.code > 1000) console.error(event);
      this.on.close?.call(this, event);
      this.#ws_notifier.notifyAll();
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
          if (sub?.options.close_on_eose) sub.stop();
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

  get ws_ready(): Promise<void> {
    return (async () => {
      switch (this.#ws.readyState) {
        case WebSocket.CONNECTING:
          await this.#ws_notifier.notified();
          /* falls through */
        case WebSocket.OPEN:
          break;

        case WebSocket.CLOSING:
          await this.#ws_notifier.notified();
          /* falls through */
        case WebSocket.CLOSED:
          this.#ws = this.connect();
          await this.#ws_notifier.notified();
          break;
      }
    })();
  }

  async ensureReady(onReady: (relay: this) => void = noop) {
    const initial = this.#ws.readyState;
    await this.ws_ready;
    if (initial > WebSocket.OPEN) onReady(this);
  }

  async send(message: ClientToRelayMessage) {
    await this.ws_ready;
    this.#ws.send(JSON.stringify(message));
  }

  async publish(event: SignedEvent) {
    await writeSafely(this, this.#writer_mutex, event);
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

type AnyRelayProvider = RemoteRelay<boolean, boolean>;

//
// Subscription and SubscriptionProvider
//
export interface SubscribeOptions {
  id?: string;
  close_on_eose?: boolean;
}

export type Subscription = Pick<
  SubscriptionProvider,
  "filter" | "options" | "events" | "pipeTo" | "pipeThrough" | "stop"
>;

class SubscriptionProvider {
  readonly id: SubscriptionId;
  readonly events: ReadableStream<SignedEvent>;

  // Expose pipeTo and pipeThrough for convenience
  readonly pipeTo: ReadableStream<SignedEvent>["pipeTo"];
  readonly pipeThrough: ReadableStream<SignedEvent>["pipeThrough"];

  readonly #reader_notifier = new Notify();
  readonly #writable: WritableStream<SignedEvent>;
  readonly #writer_mutex = new Mutex();
  #reader?: ReadableStreamDefaultController<SignedEvent>;
  #relays: Set<RemoteRelay<true, boolean>>;
  #recieved: Set<SignedEvent["id"]>;

  constructor(
    public readonly filter: Filter,
    public readonly options: SubscribeOptions,
    ...relays: RemoteRelay<true, boolean>[]
  ) {
    this.events = new ReadableStream<SignedEvent>({
      start: (controller) => {
        this.#reader = controller;
        this.#reader_notifier.notify();
      },
      pull: () => {
        this.#relays.forEach((relay) => relay.ensureReady(this.request));
      },
      cancel: () => {
        this.stop();
      },
    });
    this.pipeTo = this.events.pipeTo;
    this.pipeThrough = this.events.pipeThrough;

    this.#writable = new WritableStream<SignedEvent>({
      start: async () => {
        if (!this.#reader) {
          await this.#reader_notifier.notified();
        }
      },
      write: (event) => {
        if (!this.#recieved.has(event.id)) {
          this.#recieved.add(event.id);
          this.#reader!.enqueue(event);
        }
      },
    });

    this.id = (options.id ?? SubscriptionId.random()) as SubscriptionId;
    this.#relays = new Set(relays);
    this.#recieved = new Set();

    this.#relays.forEach((relay) => this.request(relay));
  }

  request(relay: AnyRelayProvider) {
    relay.send(["REQ", this.id, this.filter]);
  }

  stop() {
    this.#relays.forEach((relay) => {
      relay.send(["CLOSE", this.id]);
      relay.unsubscribe(this.id);
    });
  }

  async write(event: SignedEvent) {
    await this.#writer_mutex.acquire();
    const writer = this.#writable.getWriter();

    await writer.ready;
    await writer.write(event).catch(console.error);

    await writer.ready;
    writer.releaseLock();
    this.#writer_mutex.release();
  }
}
