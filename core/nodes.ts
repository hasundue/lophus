import { NostrEvent, NostrMessage } from "../nips/01.ts";
import { LazyWebSocket } from "./websockets.ts";
import { Notify } from "./x/async.ts";
import { provide, push } from "../core/x/streamtools.ts";

export interface BufferOptions {
  size: number;
  restart?: number;
}

/**
 * Common base class for relays and clients.
 */
export class NostrNode<W extends NostrMessage = NostrMessage> {
  #ws: LazyWebSocket;
  readonly #closed = new Notify();

  protected readonly messenger = new WritableStream<W>({
    write: (msg) => this.#ws.send(JSON.stringify(msg)),
  });

  #buffer: ReadableStream<W>;
  #channels: WritableStreamDefaultWriter<W>[] = [];

  constructor(
    createWebSocket: () => WebSocket,
    opts?: BufferOptions,
  ) {
    this.#ws = new LazyWebSocket(createWebSocket);

    const bufsize = opts?.size ?? 20;
    const restart = opts?.restart ?? Math.floor(bufsize / 2);

    this.#buffer = new ReadableStream<W>({
      start: (controller) => {
        this.#ws.addEventListener("message", (ev) => {
          const msg = JSON.parse(ev.data) as W;
          controller.enqueue(msg);
        });
      },
      cancel: () => this.#closed.notify(),
    }, new CountQueuingStrategy({ highWaterMark: bufsize }));
  }

  protected listen<T extends W>(messageType: T[0], listener: (msg: T) => void) {
    this.#ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data) as T;
      if (msg[0] === messageType) {
        listener(msg);
      }
    });
  }

  async send(...msgs: W[]): Promise<void> {
    await provide(this.messenger, msgs);
  }

  async close(): Promise<void> {
    this.#closed.notify();
    await this.#ws.close();
  }
}

class MessageStream<R extends NostrMessage, W extends R | NostrEvent>
  extends TransformStream<R, W> {
  constructor(
    filter: (msg: R) => W | undefined,
    restart: (msg: R) => void | Promise<void>,
    opts?: BufferOptions,
  ) {
    super({
      transform: (msg, controller) => {
        const item = filter(msg);
        if (item) controller.enqueue(item);
      },
    });
  }
}
