import type { Logger, NostrMessage } from "./types.ts";
import { WebSocketLike, WebSocketReadyState } from "./websockets.ts";
import { NonExclusiveWritableStream } from "./streams.ts";

/**
 * Common base class for relays and clients.
 */
export class NostrNode<W extends NostrMessage>
  extends NonExclusiveWritableStream<W> {
  readonly config: Readonly<NostrNodeConfig>;

  constructor(
    protected ws: WebSocketLike,
    opts: Partial<NostrNodeConfig> = {},
  ) {
    super({
      write: async (msg) => {
        opts.logger?.debug?.("[node] send", msg);
        await this.ws.send(JSON.stringify(msg));
      },
      close: async () => {
        opts.logger?.debug?.("[node] close");
        await this.ws.close();
      },
    });
    this.config = { nbuffer: 10, ...opts };
    this.ws.addEventListener("open", () => {
      opts.logger?.debug?.("[ws] open");
    });
    this.ws.addEventListener("close", () => {
      opts.logger?.debug?.("[ws] close");
    });
    this.ws.addEventListener("message", (ev) => {
      opts.logger?.debug?.("[ws] recv", ev.data);
    });
  }

  get status(): WebSocketReadyState {
    return this.ws.readyState;
  }
}

export type NostrNodeConfig = {
  nbuffer: number;
  logger?: Logger;
};
