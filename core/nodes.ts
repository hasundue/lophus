import type { WebSocketLike } from "@lophus/lib/websockets";
import type { InterNodeMessage } from "./protocol.ts";

export interface NodeConfig {
  nbuffer: number;
}

export type NodeOptions = Partial<NodeConfig>;

/**
 * Common base class for relays and clients.
 */
export class Node<
  M extends InterNodeMessage = InterNodeMessage,
  R = AnyEventTypeRecord,
> extends EventTarget {
  readonly writable: WritableStream<M>;
  readonly config: Readonly<NodeConfig>;

  constructor(
    readonly ws: WebSocketLike,
    options: NodeOptions = {},
  ) {
    super();
    this.writable = new WritableStream({
      write: (msg) => this.ws.send(JSON.stringify(msg)),
      close: () => this.ws.close(),
    });
    this.config = { nbuffer: 10, ...options };
  }

  send(msg: M): void | Promise<void> {
    return this.ws.send(JSON.stringify(msg));
  }

  get status(): WebSocket["readyState"] {
    return this.ws.readyState;
  }

  async close(): Promise<void> {
    try {
      await this.writable.close();
    } catch (err) {
      if (this.writable.locked) { // This should not happen.
        throw err;
      } // Otherwise the stream is already closed, which is fine.
    }
  }

  declare addEventListener: <T extends EventType<R>>(
    type: T,
    listener:
      | NodeEventListenerOrEventListenerObject<M, R, T>
      | null,
    options?: AddEventListenerOptions,
  ) => void;

  declare removeEventListener: <T extends EventType<R>>(
    type: T,
    listener:
      | NodeEventListenerOrEventListenerObject<M, R, T>
      | null,
    options?: boolean | EventListenerOptions,
  ) => void;

  declare dispatchEvent: <T extends EventType<R>>(
    event: NodeEvent<R, T>,
  ) => boolean;

  dispatch<T extends EventType<R>>(
    type: T,
    data: R[T],
  ) {
    this.dispatchEvent(new NodeEvent<R, T>(type, data));
  }

  on<T extends EventType<R>>(
    type: T,
    // deno-lint-ignore no-explicit-any
    listener: (data: R[T]) => any,
    options?: AddEventListenerOptions,
  ) {
    this.addEventListener(type, ({ data }) => listener(data), options);
  }
}

// ------------------------------
// Events
// ------------------------------

// deno-lint-ignore no-explicit-any
export type AnyEventTypeRecord = any;

export type EventType<R = AnyEventTypeRecord> = keyof R & string;

export class NodeEvent<
  R = AnyEventTypeRecord,
  T extends EventType<R> = EventType<R>,
> extends MessageEvent<R[T]> {
  declare type: T;
  constructor(type: T, data: R[T]) {
    super(type, { data });
  }
}

type NodeEventListenerOrEventListenerObject<
  M extends InterNodeMessage,
  R = AnyEventTypeRecord,
  T extends EventType<R> = EventType<R>,
> =
  | NodeEventListener<M, R, T>
  | NodeEventListenerObject<M, R, T>;

type NodeEventListener<
  W extends InterNodeMessage,
  R = AnyEventTypeRecord,
  T extends EventType<R> = EventType<R>,
> // deno-lint-ignore no-explicit-any
 = (this: Node<W, R>, ev: NodeEvent<R, T>) => any;

type NodeEventListenerObject<
  W extends InterNodeMessage,
  R = AnyEventTypeRecord,
  T extends EventType<R> = EventType<R>,
> = {
  // deno-lint-ignore no-explicit-any
  handleEvent(this: Node<W, R>, ev: NodeEvent<R, T>): any;
};
