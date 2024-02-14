import type { NostrMessage } from "./protocol.d.ts";
import type { Logger } from "./types.ts";
import { WebSocketLike } from "./websockets.ts";

export interface NostrNodeConfig<
  W extends NostrMessage = NostrMessage,
  R extends EventTypeRecord = EventTypeRecord,
> {
  modules: NostrNodeModule<W, R>[];
  logger: Logger;
  nbuffer: number;
}

export type NostrNodeOptions<
  W extends NostrMessage = NostrMessage,
  R extends EventTypeRecord = EventTypeRecord,
> = Partial<NostrNodeConfig<W, R>>;

/**
 * Common base class for relays and clients.
 */
export class NostrNode<
  W extends NostrMessage = NostrMessage,
  R extends EventTypeRecord = EventTypeRecord,
> extends WritableStream<W> implements EventTarget {
  readonly #eventTarget = new EventTarget();
  readonly #aborter = new AbortController();
  readonly config: Readonly<NostrNodeConfig<W, R>>;

  constructor(
    readonly ws: WebSocketLike,
    opts: NostrNodeOptions<W, R> = {},
  ) {
    super({
      write: (msg) => this.ws.send(JSON.stringify(msg)),
      close: () => this.ws.close(),
    });
    this.config = { modules: [], logger: {}, nbuffer: 10, ...opts };
    this.config.modules.forEach((m) => this.addModule(m));
  }

  send(msg: W) {
    return this.ws.send(JSON.stringify(msg));
  }

  get status(): WebSocket["readyState"] {
    return this.ws.readyState;
  }

  async close() {
    this.#aborter.abort();
    try {
      await super.close();
    } catch (err) {
      if (super.locked) { // This should not happen.
        throw err;
      } // Otherwise the stream is already closed, which is fine.
    }
  }

  addModule(module: NostrNodeModule<W, R>) {
    return module.default(this);
  }

  addEventListener<T extends EventType<R>>(
    type: T,
    listener:
      | NostrNodeEventListenerOrEventListenerObject<W, R, T>
      | null,
    options?: AddEventListenerOptions,
  ) {
    return this.#eventTarget.addEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      { signal: this.#aborter.signal, ...options },
    );
  };

  removeEventListener<T extends EventType<R>>(
    type: T,
    listener:
      | NostrNodeEventListenerOrEventListenerObject<W, R, T>
      | null,
    options?: boolean | EventListenerOptions,
  ) {
    return this.#eventTarget.removeEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      options,
    );
  };

  dispatchEvent<T extends EventType<R>>(event: NostrNodeEvent<R, T>) {
    return this.#eventTarget.dispatchEvent(event);
  };
}

// ------------------------------
// Extensions
// ------------------------------

export interface NostrNodeModule<
  W extends NostrMessage = NostrMessage,
  R extends EventTypeRecord = EventTypeRecord,
> {
  default: (node: NostrNode<W, R>) => void;
}

// ------------------------------
// Events
// ------------------------------

// deno-lint-ignore no-empty-interface
export interface EventTypeRecord {}

type EventType<R extends EventTypeRecord> = keyof R & string;

export abstract class NostrNodeEvent<
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
