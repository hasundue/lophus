import type { NostrMessage } from "./protocol.ts";
import type { Logger } from "./types.ts";
import { WebSocketLike, WebSocketReadyState } from "./websockets.ts";
import { NonExclusiveWritableStream } from "./streams.ts";

export interface NostrNodeConfig {
  logger?: Logger;
  nbuffer: number;
}

export type NostrNodeOptions = Partial<NostrNodeConfig>;

export class NostrNodeEvent<
  N,
  R = N extends NostrNode<infer R> ? R : NostrMessage,
> extends MessageEvent<R> {}

export type NostrNodeEventListener<
  R extends NostrMessage = NostrMessage,
  T extends R[0] = R[0],
> = (
  this: NostrNode,
  ev: NostrNodeEvent<R, T>,
  // deno-lint-ignore no-explicit-any
) => any;

export type NostrNodeEventListenerObject<
  T extends NostrMessage = NostrMessage,
> = {
  handleEvent(
    this: NostrNode,
    ev: NostrNodeEvent<T>,
    // deno-lint-ignore no-explicit-any
  ): any;
};

export interface NostrNodeExtension<
  R extends NostrMessage = NostrMessage,
> {
  handleNostrNodeEvent: {
    [T in R[0]]?: NostrNodeEventListener<R, T>;
  };
}

export interface NostrNodeExtensionModule {
  default: NostrNodeExtension;
}

/**
 * Common base class for relays and clients.
 */
export class NostrNode<
  W extends NostrMessage = NostrMessage,
> extends NonExclusiveWritableStream<W> {
  readonly config: Readonly<NostrNodeConfig>;
  protected readonly aborter = new AbortController();

  constructor(
    protected ws: WebSocketLike,
    opts: NostrNodeOptions = {},
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

  close() {
    this.aborter.abort();
    return super.close()
  }
}
