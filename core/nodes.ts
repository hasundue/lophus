import type { NostrMessage } from "./protocol.d.ts";
import { WebSocketLike } from "./websockets.ts";

export interface NostrNodeConfig<
  W extends NostrMessage = NostrMessage,
  R extends EventTypeRecord = EventTypeRecord,
> {
  modules: NostrNodeModule<W, R>[];
  nbuffer: number;
}

export type NostrNodeOptions<
  W extends NostrMessage = NostrMessage,
  R extends EventTypeRecord = EventTypeRecord,
> = Partial<NostrNodeConfig<W, R>>;

/**
 * Common interface for relays and clients, which extends `EventTarget`.
 */
export interface NostrNode<
  W extends NostrMessage = NostrMessage,
  R extends EventTypeRecord = EventTypeRecord,
> {
  readonly config: Readonly<NostrNodeConfig<W, R>>;
  readonly ws: WebSocketLike;
  readonly writable: WritableStream<W>;

  status: WebSocketLike["readyState"];
  send(msg: W): void | Promise<void>;
  close(): Promise<void>;

  install(mod: NostrNodeModule<W, R>): void;

  addEventListener<T extends EventType<R>>(
    type: T,
    listener:
      | NostrNodeEventListenerOrEventListenerObject<W, R, T>
      | null,
    options?: AddEventListenerOptions,
  ): void;

  removeEventListener<T extends EventType<R>>(
    type: T,
    listener:
      | NostrNodeEventListenerOrEventListenerObject<W, R, T>
      | null,
    options?: boolean | EventListenerOptions,
  ): void;

  dispatchEvent<T extends EventType<R>>(event: NostrNodeEvent<R, T>): boolean;

  /**
   * A convenience method to dispatch a `NostrNodeEvent` with the given `type`
   * and `data`.
   */
  dispatch<T extends EventType<R>>(type: T, data: R[T]): void;

  /**
   * A convenience method to add an event listener for the given `type` that
   * calls the given `listener` when the event is dispatched.
   */
  on<T extends EventType<R>>(
    type: T,
    // deno-lint-ignore no-explicit-any
    listener: (data: R[T]) => any,
  ): void;
}

/**
 * Common base class for relays and clients.
 */
export class NostrNodeBase<
  W extends NostrMessage = NostrMessage,
  R extends EventTypeRecord = EventTypeRecord,
> extends EventTarget implements NostrNode<W, R> {
  readonly writable: WritableStream<W>;
  readonly config: Readonly<NostrNodeConfig<W, R>>;

  constructor(
    readonly ws: WebSocketLike,
    opts: NostrNodeOptions = {},
  ) {
    super();
    this.writable = new WritableStream({
      write: (msg) => this.ws.send(JSON.stringify(msg)),
      close: () => this.ws.close(),
    });
    this.config = { modules: [], nbuffer: 10, ...opts };
    this.config.modules.forEach((m) => this.install(m));
  }

  send(msg: W) {
    return this.ws.send(JSON.stringify(msg));
  }

  get status() {
    return this.ws.readyState;
  }

  async close() {
    try {
      await this.writable.close();
    } catch (err) {
      if (this.writable.locked) { // This should not happen.
        throw err;
      } // Otherwise the stream is already closed, which is fine.
    }
  }

  install(mod: NostrNodeModule<W, R>) {
    return mod.install(this);
  }

  declare addEventListener: NostrNode<W, R>["addEventListener"];
  declare removeEventListener: NostrNode<W, R>["removeEventListener"];
  declare dispatchEvent: NostrNode<W, R>["dispatchEvent"];

  dispatch<T extends EventType<R>>(
    type: T,
    data: R[T],
  ) {
    this.dispatchEvent(new NostrNodeEvent<R, T>(type, data));
  }

  on<T extends EventType<R>>(
    type: T,
    // deno-lint-ignore no-explicit-any
    listener: (data: R[T]) => any,
  ) {
    this.addEventListener(type, ({ data }) => listener(data));
  }
}

// ------------------------------
// Extensions
// ------------------------------

export interface NostrNodeModule<
  W extends NostrMessage = NostrMessage,
  R extends EventTypeRecord = EventTypeRecord,
  N extends NostrNode<W, R> = NostrNode<W, R>,
> {
  // deno-lint-ignore no-explicit-any
  install(node: N): any;
}

// ------------------------------
// Events
// ------------------------------

// deno-lint-ignore no-empty-interface
export interface EventTypeRecord {}

type EventType<R extends EventTypeRecord> = keyof R & string;

export class NostrNodeEvent<
  R extends EventTypeRecord,
  T extends EventType<R>,
> extends MessageEvent<R[T]> {
  declare type: T;
  constructor(type: T, data: R[T]) {
    super(type, { data });
  }
}

type NostrNodeEventListenerOrEventListenerObject<
  W extends NostrMessage,
  R extends EventTypeRecord,
  T extends EventType<R>,
> = NostrNodeEventListener<W, R, T> | NostrNodeEventListenerObject<W, R, T>;

type NostrNodeEventListener<
  W extends NostrMessage,
  R extends EventTypeRecord,
  T extends EventType<R>,
> // deno-lint-ignore no-explicit-any
 = (this: NostrNode<W, R>, ev: MessageEvent<R[T]>) => any;

type NostrNodeEventListenerObject<
  W extends NostrMessage,
  R extends EventTypeRecord,
  T extends EventType<R>,
> = {
  // deno-lint-ignore no-explicit-any
  handleEvent(this: NostrNode<W, R>, ev: MessageEvent<R[T]>): any;
};
