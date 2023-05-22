import { NostrMessage } from "../nips/01.ts";
import { LazyWebSocket } from "./websockets.ts";
import { Notify } from "./x/async.ts";

/**
 * A Nostr Relay or Client.
 */
export class NostrNode<
  R extends NostrMessage = NostrMessage,
  W extends NostrMessage = NostrMessage,
> {
  #ws: LazyWebSocket;
  #notifier = new Notify();

  constructor(protected createWebSocket: () => WebSocket) {
    this.#ws = new LazyWebSocket(createWebSocket);
  }

  get messages() {
    return new ReadableStream<R>({
      start: async (controller) => {
        this.#ws.addEventListener("message", (event: MessageEvent<string>) => {
          controller.enqueue(JSON.parse(event.data));
        });
        // close the stream when the node is closed.
        await this.#notifier.notified();
        controller.close();
      },
    });
  }

  get messenger() {
    const stream = new WritableStream<W>({
      write: (msg) => this.#ws.send(JSON.stringify(msg)),
    });
    // close the stream when the node is closed.
    (async () => {
      await this.#notifier.notified();
      stream.close();
    })();
    return stream;
  }

  async send(...msgs: W[]): Promise<void> {
    const writer = this.messenger.getWriter();
    for (const msg of msgs) {
      await writer.ready;
      writer.write(msg).catch(console.error);
    }
    writer.close();
  }

  async close() {
    await this.#ws.close();
    this.#notifier.notifyAll(); // close the messages streams.
  }
}
