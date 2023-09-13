import type { Logger, NostrMessage } from "./types.ts";
import { LazyWebSocket, type WebSocketReadyState } from "./websockets.ts";
import { NonExclusiveWritableStream } from "./streams.ts";

/**
 * Common base class for relays and clients.
 */
export class NostrNode<W extends NostrMessage = NostrMessage>
  extends NonExclusiveWritableStream<W> {
  readonly config: Readonly<NostrNodeConfig>;
  protected ws: LazyWebSocket;

  constructor(
    url: string | URL,
    opts: Partial<NostrNodeConfig> = {},
  ) {
    super({
      write: (msg): Promise<void> => {
        opts.logger?.debug?.("[node] send", msg);
        return this.ws.send(JSON.stringify(msg));
      },
      close: (): Promise<void> => {
        opts.logger?.debug?.("[node] close");
        return this.ws.close();
      },
    });
    this.config = { nbuffer: 10, ...opts };
    this.ws = new LazyWebSocket(url);
  }

  get status(): WebSocketReadyState {
    return this.ws.readyState;
  }
}

export type NostrNodeConfig = {
  nbuffer: number;
  logger?: Logger;
};
