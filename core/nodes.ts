import type { NostrMessage } from "../nips/01.ts";
import type { Logger } from "./types.ts";
import { WebSocketLike, WebSocketReadyState } from "./websockets.ts";
import { NonExclusiveWritableStream } from "./streams.ts";

export interface NostrNodeConfig<N extends NIP> {
  logger?: Logger;
  nbuffer: number;
  nips: N[];
}

export type NostrNodeOptions<N extends NIP> = Partial<NostrNodeConfig<N>>;

/**
 * Common base class for relays and clients.
 */
export class NostrNode<
  W extends NostrMessage = NostrMessage,
  N extends NIP = NIP,
> extends NonExclusiveWritableStream<W> {
  readonly config: Readonly<NostrNodeConfig<N>>;
  constructor(
    protected ws: WebSocketLike,
    opts: NostrNodeOptions<N> = { nips: NIPs as N[] },
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
    this.config = { nbuffer: 10, nips: NIPs, ...opts };
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

export const NIPs = [1, 2, 42] as const;
export type NIP = typeof NIPs[number];
