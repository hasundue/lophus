import type { NostrMessage } from "./types.ts";
import { LazyWebSocket, WebSocketReadyState } from "./websockets.ts";
import { NonExclusiveWritableStream } from "./streams.ts";

/**
 * Common base class for relays and clients.
 */
export class NostrNode<W extends NostrMessage = NostrMessage>
  extends NonExclusiveWritableStream<W> {
  readonly config: Readonly<NostrNodeConfig>;
  protected ws: LazyWebSocket;

  constructor(
    createWebSocket: () => WebSocket,
    config: Partial<NostrNodeConfig> = {},
  ) {
    super({
      write: (msg) => this.ws.send(JSON.stringify(msg)),
      close: () => {
        return this.ws.close();
      },
    });
    this.config = { nbuffer: 10, ...config };
    this.ws = new LazyWebSocket(createWebSocket);
  }

  get status(): WebSocketReadyState {
    return this.ws.status;
  }

  get connected(): Promise<void> {
    return this.ws.ready;
  }
}

export type NostrNodeConfig = {
  nbuffer: number;
};
