import type { NostrMessage } from "./protocol.d.ts";
import type { Logger } from "./types.ts";
import { WebSocketLike } from "./websockets.ts";

export interface NostrNodeConfig {
  logger: Logger;
  nbuffer: number;
}

export type NostrNodeOptions = Partial<NostrNodeConfig>;

/**
 * Common base class for relays and clients.
 */
export class NostrNode<
  W extends NostrMessage = NostrMessage,
  E extends EventDataTypeRecord = EventDataTypeRecord,
> extends WritableStream<W> implements EventTarget {
  readonly #eventTarget = new EventTarget();
  readonly #aborter = new AbortController();
  readonly config: Readonly<NostrNodeConfig>;

  constructor(
    readonly ws: WebSocketLike,
    opts: NostrNodeOptions = {},
  ) {
    super({
      write: (msg) => this.ws.send(JSON.stringify(msg)),
      close: () => this.ws.close(),
    });
    this.config = { logger: {}, nbuffer: 10, ...opts };
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

  addEventListener = <T extends EventType<E>>(
    type: T,
    listener: NostrNodeEventListenerOrEventListenerObject<E, T> | null,
    options?: AddEventListenerOptions,
  ) => {
    return this.#eventTarget.addEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      { signal: this.#aborter.signal, ...options },
    );
  };

  removeEventListener = <T extends EventType<E>>(
    type: T,
    listener: NostrNodeEventListenerOrEventListenerObject<E, T> | null,
    options?: boolean | EventListenerOptions,
  ) => {
    return this.#eventTarget.removeEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      options,
    );
  };

  dispatchEvent = <T extends EventType<E>>(
    event: NostrNodeEvent<E, T>,
  ) => {
    return this.#eventTarget.dispatchEvent(event);
  };
}

// ------------------------------
// Extensions
// ------------------------------

export interface NostrNodeModule<
  W extends NostrMessage = NostrMessage,
  E extends EventDataTypeRecord = EventDataTypeRecord,
> {
  default: NostrNodeModuleInstaller<W, E>;
}

export type NostrNodeModuleInstaller<
  W extends NostrMessage = NostrMessage,
  E extends EventDataTypeRecord = EventDataTypeRecord,
> = (node: NostrNode<W, E>) => void;

// ------------------------------
// Events
// ------------------------------

type EventDataTypeRecord = Record<string, MessageEventInit["data"]>;

type EventType<R extends EventDataTypeRecord> = keyof R & string;

type NostrNodeEventListenerOrEventListenerObject<
  R extends EventDataTypeRecord,
  T extends EventType<R>,
> = NostrNodeEventListener<R, T> | NostrNodeEventListenerObject<R, T>;

type NostrNodeEventListener<
  R extends EventDataTypeRecord,
  T extends EventType<R>,
> // deno-lint-ignore no-explicit-any
 = (this: NostrNode, ev: NostrNodeEvent<R, T>) => any;

type NostrNodeEventListenerObject<
  R extends EventDataTypeRecord,
  T extends EventType<R>,
> = {
  // deno-lint-ignore no-explicit-any
  handleEvent(this: NostrNode, ev: NostrNodeEvent<R, T>): any;
};

export class NostrNodeEvent<
  R extends EventDataTypeRecord,
  T extends EventType<R>,
> extends MessageEvent<R[T]> {}
