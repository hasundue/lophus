import { NostrMessage } from "../nips/01.ts";
import { LazyWebSocket } from "./websockets.ts";
import { Notify } from "./x/async.ts";
import {
  broadcast,
  LophusReadableStream,
  LophusReadableStreamQueuingThresholds,
} from "./streams.ts";
import { provide } from "../core/x/streamtools.ts";

export type LophusMessage = LophusRestartMessage;
export type LophusRestartMessage = ["RESTART"];

export type MessageBufferOptions = LophusReadableStreamQueuingThresholds;

/**
 * Common base class for relays and clients.
 */
export class NostrNode<W extends LophusMessage | NostrMessage> {
  #ws: LazyWebSocket;
  readonly #closed = new Notify();

  protected readonly messenger = new WritableStream<W>({
    write: (msg) => this.#ws.send(JSON.stringify(msg)),
  });

  #messages: LophusReadableStream<W>;
  #channels: WritableStream<W>[] = [];

  constructor(
    createWebSocket: () => WebSocket,
    opts?: MessageBufferOptions,
  ) {
    this.#ws = new LazyWebSocket(createWebSocket);

    this.#messages = new LophusReadableStream<W>({
      start: (controller) => {
        this.#ws.addEventListener("message", (ev) => {
          const msg = JSON.parse(ev.data) as W;
          controller.enqueue(msg);
          controller.adjustBackpressure();
        });
      },
      stop: () => {
        this.#ws.close();
        this.#closed.notify();
      },
      restart: (controller) => {
        controller.enqueue(["RESTART"]);
      },
      cancel: () => this.#closed.notify(),
    }, opts);

    broadcast(this.#messages, this.#channels);
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
