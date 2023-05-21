import { WebSocketEventHooks } from "./lib/types.ts";
import {
  Filter,
  NostrMessage,
  SignedEvent,
  SubscriptionId,
} from "./nips/01.ts";
import { Mutex, Notify } from "./lib/x/async.ts";

export type NostrEventHooks =
  & RelayToClientEventHooks
  & ClientToRelayEventHooks;

export type RelayToClientEventHooks =
  & WebSocketEventHooks
  & RelayToClientMessageHooks;

export type RelayToClientMessageHooks = {
  "event": (id: SubscriptionId, event: SignedEvent) => void;
  "eose": (id: SubscriptionId) => void;
  "notice": (message: string) => void;
};

export type ClientToRelayEventHooks =
  & WebSocketEventHooks
  & RelayToClientMessageHooks;

export type ClientToRelayMessageHooks = {
  "publish": (event: SignedEvent) => void;
  "subscribe": (id: SubscriptionId, ...filter: Filter[]) => void;
  "close": (id: SubscriptionId) => void;
};

export class NostrNode<
  R extends NostrMessage = NostrMessage,
  W extends NostrMessage = NostrMessage,
> {
  #ws: LazyWebSocket;
  #writer_mutex = new Mutex();

  constructor(
    protected createWebSocket: () => WebSocket,
    protected on: NostrEventHooks,
  ) {
    this.#ws = new LazyWebSocket(createWebSocket, on);
  }

  get messages() {
    return new ReadableStream<R>({
      start: (controller) => {
        this.#ws.addEventListener("message", (ev: MessageEvent<string>) => {
          const msg = JSON.parse(ev.data) as R;
          controller.enqueue(msg);
        });
      },
    });
  }

  get events(): ReadableStream<SignedEvent> {
    return this.messages.pipeThrough(new EventStreamProvider());
  }

  get sender() {
    return new WritableStream<W>({
      write: (msg) => this.#ws.send(JSON.stringify(msg)),
    });
  }

  async send(...msgs: W[]): Promise<void> {
    for (const msg of msgs) {
      await this.#writer_mutex.acquire();
      const writer = this.sender.getWriter();

      await writer.ready;
      await writer.write(msg).catch(console.error);

      await writer.ready;
      writer.releaseLock();
      this.#writer_mutex.release();
    }
  }
}

export class EventStreamProvider<R extends NostrMessage>
  extends TransformStream<R, SignedEvent> {
  constructor() {
    super({
      transform: (msg, controller) => {
        if (msg[0] === "EVENT") {
          // TypeScript is not smart enough so we have to use `as` here.
          controller.enqueue(msg[msg.length > 2 ? 2 : 1] as SignedEvent);
        }
      },
    });
  }
}

/**
 * A lazy WebSocket that creates a connection when it is needed.
 * It will also wait for the webSocket to be ready before sending any data.
 */
class LazyWebSocket {
  #ws?: WebSocket;
  #notifier = new Notify();

  constructor(
    protected createWebSocket: () => WebSocket,
    protected on: WebSocketEventHooks,
  ) {}

  protected ensureCreated(): WebSocket {
    return this.#ws ?? (this.#ws = this.createWebSocket());
  }

  protected async ensureReady(): Promise<WebSocket> {
    // If the webSocket is not created yet, create it.
    if (!this.#ws) {
      this.#ws = this.createWebSocket();

      this.#ws.addEventListener("open", (ev) => {
        this.on.open?.call(this.#ws, ev);
        this.#notifier.notifyAll();
      });

      this.#ws.addEventListener("close", (ev) => {
        this.on.close?.call(this, ev);
        this.#notifier.notifyAll();
      });
    }
    // If the webSocket is not ready yet, wait for it.
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
        this.#ws = this.createWebSocket();
        await this.#notifier.notified();
    }
    return this.#ws;
  }

  async send(data: Parameters<WebSocket["send"]>[0]): Promise<void> {
    this.#ws = await this.ensureReady();
    this.#ws.send(data);
  }

  addEventListener<T extends keyof WebSocketEventMap>(
    type: T,
    listener: (this: WebSocket, ev: WebSocketEventMap[T]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ) {
    this.#ws = this.ensureCreated();
    this.#ws.addEventListener(type, listener, options);
  }
}
