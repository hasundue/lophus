import { NostrMessage } from "../nips/01.ts";
import { LazyWebSocket } from "./websockets.ts";
import {
  broadcast,
  createImpatientReadableStream,
  ImpatientStreamQueuingStrategy,
} from "./streams.ts";
import { provide } from "./x/streamtools.ts";

/**
 * Internal messages which are not part of the Nostr protocol.
 */
export type InternalMessage = RestartMessage;
export type RestartMessage = ["RESTART"];

export type MessageBufferOptions = ImpatientStreamQueuingStrategy;

/**
 * Common base class for relays and clients.
 */
export class NostrNode<R extends NostrMessage, W extends NostrMessage> {
  #ws: LazyWebSocket;

  readonly #messages: ReadableStream<R | InternalMessage>;
  readonly #channels: WritableStream<R | InternalMessage>[] = [];

  constructor(
    createWebSocket: () => WebSocket,
    opts?: MessageBufferOptions,
  ) {
    this.#ws = new LazyWebSocket(createWebSocket);

    this.#messages = createImpatientReadableStream<R | InternalMessage>({
      start: (controller) => {
        this.#ws.addEventListener("message", (ev) => {
          const msg = JSON.parse(ev.data) as R;
          controller.enqueue(msg);
        });
      },
      stop: async () => {
        // TODO: let other listeners wait until restart
        await this.#ws.close();
      },
      restart: (controller) => {
        // TODO: notify other listeners
        controller.enqueue(["RESTART"]);
      },
    }, opts);

    broadcast(this.#messages, this.#channels, "any");
  }

  protected listen(writable: WritableStream<R | InternalMessage>) {
    this.#channels.push(writable);
  }

  async send(...msgs: W[]): Promise<void> {
    await provide(this.messenger, msgs);
  }

  readonly messenger = new WritableStream<W>({
    write: (msg) => this.#ws.send(JSON.stringify(msg)),
  });

  async close(): Promise<void> {
    await this.#ws.close();
  }
}
