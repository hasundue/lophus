import type {
  ClientToRelayMessage,
  EventKind,
  NostrEvent,
  RelayToClientMessage,
  RelayToClientMessageType,
  RelayUrl,
  SubscriptionFilter,
  SubscriptionId,
} from "../nips/01.ts";
import type { Stringified } from "./types.ts";
import { NonExclusiveWritableStream } from "./streams.ts";
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

export interface SubscriptionOptions {
  id: string;
  realtime: boolean;
  nbuffer: number;
}

export type SubscriptionEventListener<T extends SubscriptionEventType> = (
  this: Relay,
  ev: RelayEvent<T>,
) => void;

/**
 * A class that represents a remote Nostr Relay.
 */
export class Relay extends NostrNode<ClientToRelayMessage> {
  readonly config: Readonly<RelayConfig>;
  declare ws: LazyWebSocket;

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

  subscribe<K extends EventKind>(
    filter: SubscriptionFilter<K> | SubscriptionFilter<K>[],
    opts: Partial<SubscriptionOptions> = {},
  ): ReadableStream<NostrEvent<K>> {
    const sid = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    opts.realtime ??= true;
    opts.nbuffer ??= this.config.nbuffer;

    const messenger = this.getWriter();
    const request = () => messenger.write(["REQ", sid, ...[filter].flat()]);

    return new ReadableStream<NostrEvent<K>>({
      start: () => {
        new BroadcastChannel(sid).addEventListener(
          "message",
          async (ev: MessageEvent<SubscriptionMessage>) => {
            const msg = ev.data;
            const type = msg[0];
            NIPs.registered.forEach(async (nip) => {
              const mod = await this.importRelayExtension(nip);
              if (!mod) return;
              for (
                const entry of entries(mod.default.handleSubscriptionEvent)
              ) {
                this.addSubscriptionEventListenerEntry(entry);
              }
            });
          },
        );
        this.ws.addEventListener("open", request);
        if (this.ws.readyState === WebSocket.OPEN) {
          return request();
        }
      },
      pull: () => {
        return this.ws.ready();
      },
      cancel: async () => {
        this.ws.removeEventListener("open", request);
        if (this.ws.readyState === WebSocket.OPEN) {
          await messenger.write(["CLOSE", sid]);
        }
        return messenger.close();
      },
    }, new CountQueuingStrategy({ highWaterMark: opts.nbuffer }));
  }

  protected addSubscriptionEventListenerEntry<
    T extends SubscriptionEventType,
  >(
    entry: [T, RelayExtension["handleSubscriptionEvent"][T]],
  ) {
    if (entry[1]) this.addEventListener(entry[0], entry[1]);
  }
}

export type SubscriptionEventType = "EVENT" | "EOSE";

export type SubscriptionMessage<
  T extends SubscriptionEventType = SubscriptionEventType,
> = RelayToClientMessage<T>;

export interface RelayLike
  extends NonExclusiveWritableStream<ClientToRelayMessage> {
  subscribe: Relay["subscribe"];
}
