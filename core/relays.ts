import type { Stringified } from "./types.ts";
import type {
  ClientToRelayMessage,
  RelayToClientMessage,
  RelayToClientMessageType,
  RelayUrl,
} from "../nips/01.ts";
import { NostrNode, NostrNodeConfig } from "./nodes.ts";
import { LazyWebSocket } from "./websockets.ts";
import { type NIP, NIPs } from "./nips.ts";
import { entries } from "./utils.ts";

export interface RelayConfig extends NostrNodeConfig {
  url: RelayUrl;
  name: string;
  read: boolean;
  write: boolean;
}

export type RelayOptions = Partial<RelayConfig>;

export interface RelayInit extends RelayOptions {
  url: RelayUrl;
}

export class RelayEvent<
  T extends RelayToClientMessageType = RelayToClientMessageType,
> extends MessageEvent<RelayToClientMessage<T>> {}

export type RelayEventListener<T extends RelayToClientMessageType> = (
  this: Relay,
  ev: RelayEvent<T>,
  // deno-lint-ignore no-explicit-any
) => any;

export type RelayEventListenerObject<T extends RelayToClientMessageType> = {
  handleEvent(
    this: Relay,
    ev: RelayEvent<T>,
    // deno-lint-ignore no-explicit-any
  ): any;
};

/**
 * A class that represents a remote Nostr Relay.
 */
export class Relay extends NostrNode<ClientToRelayMessage> {
  declare ws: LazyWebSocket;
  readonly config: Readonly<RelayConfig>;

  declare addEventListener: <T extends RelayToClientMessageType>(
    type: T,
    listener: RelayEventListener<T> | RelayEventListenerObject<T> | null,
  ) => void;
  declare removeEventListener: <T extends RelayToClientMessageType>(
    type: T,
    listener: RelayEventListener<T> | RelayEventListenerObject<T> | null,
  ) => void;
  declare dispatchEvent: (event: RelayEvent) => boolean;

  constructor(
    init: RelayUrl | RelayInit,
    opts?: RelayOptions,
  ) {
    const url = typeof init === "string" ? init : init.url;
    super(
      new LazyWebSocket(url),
      { nbuffer: 10, ...opts },
    );
    // deno-fmt-ignore
    this.config = {
      url, name: new URL(url).hostname,
      read: true, write: true, nbuffer: 10, ...opts,
    };
    NIPs.registered.forEach(async (nip) => {
      const mod = await this.importRelayExtension(nip);
      if (!mod) return;
      for (const entry of entries(mod.default.handleRelayEvent)) {
        this.addEventListenerEntry(entry);
      }
    });
    this.ws.addEventListener(
      "message",
      (ev: MessageEvent<Stringified<RelayToClientMessage>>) => {
        // TODO: Validate message.
        const msg = JSON.parse(ev.data) as RelayToClientMessage;

        const type = msg[0];
        this.dispatchEvent(new RelayEvent(type, { data: msg }));
      },
    );
  }

  protected importRelayExtension(nip: NIP) {
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

export interface RelayExtensionModule {
  default: RelayExtension;
}

export interface RelayExtension {
  handleRelayEvent: {
    [T in RelayToClientMessageType]?: RelayEventListener<T>;
  };
}
