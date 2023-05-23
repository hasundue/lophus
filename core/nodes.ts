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
  #closed = new Notify();

  constructor(protected createWebSocket: () => WebSocket) {
    this.#ws = new LazyWebSocket(createWebSocket);
  }

  get messages() {
    return new ReadableStream<R>({
      start: (controller) => {
        this.#ws.addEventListener("message", (event: MessageEvent<string>) => {
          controller.enqueue(JSON.parse(event.data));
        });
      },
    });
  }

  get messenger(): WritableStream<W> {
    const stream = new WritableStream<W>({
      write: (msg) => this.#ws.send(JSON.stringify(msg)),
    });
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

  async close(): Promise<void> {
    this.#closed.notify();
    await this.#ws.close();
  }
}
