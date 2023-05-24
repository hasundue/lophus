import { NostrMessage } from "../nips/01.ts";
import { LazyWebSocket } from "./websockets.ts";
import {
  broadcast,
  createImpatientReadableStream,
  ImpatientReadableStreamQueuingStrategy,
} from "./streams.ts";
import { provide } from "../core/x/streamtools.ts";

export type LophusMessage = RestartMessage;
export type RestartMessage = ["RESTART"];

export type MessageBufferOptions = ImpatientReadableStreamQueuingStrategy;

/**
 * Common base class for relays and clients.
 */
export class NostrNode<R extends NostrMessage, W extends NostrMessage> {
  #ws: LazyWebSocket;

  readonly messenger = new WritableStream<W>({
    write: (msg) => this.#ws.send(JSON.stringify(msg)),
  });

  #messages: ReadableStream<R | LophusMessage>;
  #channels: WritableStream<R | LophusMessage>[] = [];

  constructor(
    createWebSocket: () => WebSocket,
    opts?: MessageBufferOptions,
  ) {
    this.#ws = new LazyWebSocket(createWebSocket);

    this.#messages = createImpatientReadableStream<R | LophusMessage>({
      start: (controller) => {
        this.#ws.addEventListener("message", (ev) => {
          const msg = JSON.parse(ev.data) as R;
          controller.enqueue(msg);
        });
      },
      stop: () => {
        this.#ws.close();
      },
      restart: (controller) => {
        controller.enqueue(["RESTART"]);
      },
    }, opts);

    broadcast(this.#messages, this.#channels);
  }

  protected listen<S extends unknown>(
    listener: (msg: R | LophusMessage) => S | undefined,
  ): ReadableStream<S> {
    const channel = new TransformStream<R | LophusMessage, S>({
      transform(msg, controller) {
        const result = listener(msg);
        if (result) controller.enqueue(result);
      },
    });
    this.#channels.push(channel.writable);
    return channel.readable;
  }

  async send(...msgs: W[]): Promise<void> {
    await provide(this.messenger, msgs);
  }

  async close(): Promise<void> {
    await this.#ws.close();
  }
}
