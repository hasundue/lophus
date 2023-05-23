import { NostrMessage } from "../nips/01.ts";
import { LazyWebSocket } from "./websockets.ts";
import { Notify } from "./x/async.ts";
import { provide } from "../core/x/streamtools.ts";

/**
 * A Nostr Relay or Client.
 */
export class NostrNode<W extends NostrMessage = NostrMessage> {
  protected ws: LazyWebSocket;
  protected readonly closed = new Notify();

  protected readonly messenger = new WritableStream<W>({
    write: (msg) => this.ws.send(JSON.stringify(msg)),
  });

  constructor(createWebSocket: () => WebSocket) {
    this.ws = new LazyWebSocket(createWebSocket);
  }

  async send(...msgs: W[]): Promise<void> {
    await provide(this.messenger, msgs);
  }

  async close(): Promise<void> {
    this.closed.notify();
    await this.ws.close();
  }
}
