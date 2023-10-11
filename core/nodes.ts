import type { NostrMessage } from "../nips/01.ts";
import type { Logger } from "./types.ts";
import { entries } from "./utils.ts";
import { WebSocketLike, WebSocketReadyState } from "./websockets.ts";
import { NonExclusiveWritableStream } from "./streams.ts";
import { type NIP, NIPs } from "./nips.ts";

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
    this.installExtensions();
  }

  get status(): WebSocketReadyState {
    return this.ws.readyState;
  }

  protected async installExtensions(): Promise<true> {
    await Promise.all(
      Array.from(NIPs.registered.values()).map(async (nip) => {
        const mod = await this.importExtension(nip);
        if (!mod) return;
        for (const entry of entries(mod.default.handleNostrNodeEvent)) {
          this.addEventListenerEntry(entry);
        }
      }),
    );
    return true;
  }

  protected importExtension(nip: NIP) {
    const file = basename(import.meta.url);
    try {
      return import(`../nips/${nip}/${file}`) as Promise<
        NostrNodeExtensionModule
      >;
    } catch {
      this.config.logger?.debug?.(
        `NostrNode extension is not provided for NIP-${nip}`,
      );
      return undefined;
    }
  }

  protected addEventListenerEntry<T extends W[0]>(
    entry: [T, NostrNodeExtension["handleNostrNodeEvent"][T]],
  ) {
    if (entry[1]) this.addEventListener(entry[0], entry[1]);
  }
}
