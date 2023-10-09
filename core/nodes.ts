import type { NostrMessage } from "../nips/01.ts";
import type { Logger } from "./types.ts";
import { WebSocketLike, WebSocketReadyState } from "./websockets.ts";
import { NonExclusiveWritableStream } from "./streams.ts";
import { type NIP, NIPs } from "./nips.ts";

export interface NostrNodeConfig {
  logger?: Logger;
  nbuffer: number;
}

export type NostrNodeOptions = Partial<NostrNodeConfig>;

export class NostrNodeEvent<
  T extends NostrMessage = NostrMessage,
> extends MessageEvent<T> {}

export type NostrNodeEventListener<T extends NostrMessage = NostrMessage> = (
  this: NostrNode,
  ev: NostrNodeEvent<T>,
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

class NostrNodeEventTarget<
  W extends NostrMessage = NostrMessage,
> extends EventTarget {
  declare addEventListener: <T extends W[0]>(
    type: T,
    listener:
      | NostrNodeEventListener<W>
      | NostrNodeEventListenerObject<W>
      | null,
  ) => void;
  declare removeEventListener: <T extends W[0]>(
    type: T,
    listener:
      | NostrNodeEventListener<W>
      | NostrNodeEventListenerObject<W>
      | null,
  ) => void;
  declare dispatchEvent: (event: NostrNodeEvent<W>) => boolean;
}

export interface NostrNodeExtension<
  W extends NostrMessage = NostrMessage,
> {
  handleEvent: {
    [T in W[0]]?: RelayEventListener<T>;
  };
  handleSubscriptionEvent: {
    [T in W[0]]?: SubscriptionEventListener<T>;
  };
}

export interface RelayExtensionModule {
  default: RelayExtension;
}

/**
 * Common base class for relays and clients.
 */
export class NostrNode<
  W extends NostrMessage = NostrMessage,
> extends NonExclusiveWritableStream<W> {
  readonly config: Readonly<NostrNodeConfig>;
  readonly #eventTarget = new NostrNodeEventTarget<W>();

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

  protected installExtensions() {
    return Promise.all(
      Array.from(NIPs.registered.values()).map(async (nip) => {
        const mod = await this.importExtension(nip);
        if (!mod) return;
        for (const entry of entries(mod.default.handleRelayEvent)) {
          this.addEventListenerEntry(entry);
        }
      }),
    );
  }

  protected importExtension(nip: NIP) {
    try {
      return import(`../nips/${nip}/relays.ts`) as Promise<
        RelayExtensionModule
      >;
    } catch {
      this.config.logger?.debug?.(
        `Relay extension is not provided for NIP-${nip}`,
      );
      return undefined;
    }
  }

  protected addEventListenerEntry<T extends RelayToClientMessageType>(
    entry: [T, RelayExtension["handleRelayEvent"][T]],
  ) {
    if (entry[1]) this.addEventListener(entry[0], entry[1]);
  }
}
