import type { Stringified } from "./types.ts";
import type {
  ClientToRelayMessage,
  EventKind,
  NostrEvent,
  RelayToClientMessage,
  RelayUrl,
  SubscriptionFilter,
  SubscriptionId,
} from "./protocol.d.ts";
import { LazyWebSocket } from "./websockets.ts";
import {
  NostrNode,
  NostrNodeConfig,
  NostrNodeEvent,
  NostrNodeModule,
} from "./nodes.ts";
import { importNips } from "./nips.ts";

// ----------------------
// NIPs
// ----------------------

const NIPs = await importNips<
  ClientToRelayMessage,
  RelayEventTypeRecord,
  Relay
>(import.meta.url, "../nips");

// ----------------------
// Errors
// ----------------------

export class EventRejected extends Error {}
export class ConnectionClosed extends Error {}

// ----------------------
// Interfaces
// ----------------------

export interface RelayConfig
  extends NostrNodeConfig<ClientToRelayMessage, RelayEventTypeRecord> {
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
  id?: string;
  realtime?: boolean;
  nbuffer?: number;
}

/**
 * A class that represents a remote Nostr Relay.
 */
export class Relay extends NostrNode<
  ClientToRelayMessage,
  RelayEventTypeRecord
> {
  declare ws: LazyWebSocket;
  readonly config: Readonly<RelayConfig>;

  constructor(
    init: RelayUrl | RelayInit,
    options?: RelayOptions,
  ) {
    const url = typeof init === "string" ? init : init.url;
    const config = {
      nbuffer: 10,
      logger: {},
      ...options,
      modules: NIPs.concat(options?.modules ?? []),
    };
    super(new LazyWebSocket(url), config);
    this.config = {
      url,
      name: new URL(url).hostname,
      read: true,
      write: true,
      ...config,
    };
    this.ws.addEventListener(
      "message",
      (ev: MessageEvent<Stringified<RelayToClientMessage>>) => {
        const message = JSON.parse(ev.data) as RelayToClientMessage;
        // TODO: Validate the message.
        return this.dispatchEvent(new RelayEvent("message", message));
      },
    );
  }

  subscribe<K extends EventKind>(
    filter: SubscriptionFilter<K> | SubscriptionFilter<K>[],
    options: Partial<SubscriptionOptions> = {},
  ): ReadableStream<NostrEvent<K>> {
    options.realtime ??= true;
    options.nbuffer ??= this.config.nbuffer;
    const context = {
      id: (options.id ?? crypto.randomUUID()) as SubscriptionId,
      filters: [filter].flat(),
      options,
    };
    return new ReadableStream<NostrEvent<K>>({
      start: (controller) => {
        this.dispatchEvent(
          new RelayEvent("subscribe", { ...context, controller }),
        );
      },
      pull: (controller) => {
        this.dispatchEvent(new RelayEvent("pull", { ...context, controller }));
      },
      cancel: (reason) => {
        this.dispatchEvent(
          new RelayEvent("unsubscribe", { ...context, reason }),
        );
      },
    }, new CountQueuingStrategy({ highWaterMark: options.nbuffer }));
  }

  /**
   * Publish an event to the relay and wait for a response.
   *
   * @throws {EventRejected} If the event is rejected by the relay
   * @throws {ConnectionClosed} If the WebSocket connection to the relay is closed
   */
  publish<K extends EventKind>(event: NostrEvent<K>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.dispatchEvent(
        new RelayEvent("publish", { event, resolve, reject }),
      );
      this.ws.addEventListener(
        "close",
        () => reject(new ConnectionClosed()),
        { once: true },
      );
    });
  }
}

// ----------------------
// RelayLikes
// ----------------------

export interface RelayLike extends WritableStream<ClientToRelayMessage> {
  readonly config: RelayLikeConfig;
  send: Relay["send"];
  subscribe: Relay["subscribe"];
  publish: Relay["publish"];
}

export type RelayLikeConfig = Omit<RelayConfig, "url">;
export type RelayLikeOptions = Partial<RelayLikeConfig>;

// ----------------------
// Events
// ----------------------

export interface SubscriptionContext {
  id: SubscriptionId;
  filters: SubscriptionFilter[];
  options: SubscriptionOptions;
}

export interface SubscriptionContextWithController extends SubscriptionContext {
  controller: ReadableStreamDefaultController<NostrEvent>;
}

export interface SubscriptionContextWithReason extends SubscriptionContext {
  reason: unknown;
}

export interface PublicationContext {
  event: NostrEvent;
  resolve: () => void;
  reject: (reason: unknown) => void;
}

export interface RelayEventTypeRecord {
  message: RelayToClientMessage;
  subscribe: SubscriptionContextWithController;
  pull: SubscriptionContextWithController;
  unsubscribe: SubscriptionContextWithReason;
  publish: PublicationContext;
}

export type RelayEventType = keyof RelayEventTypeRecord;

export class RelayEvent<
  T extends RelayEventType = RelayEventType,
> extends NostrNodeEvent<RelayEventTypeRecord, T> {}

// ----------------------
// Modules
// ----------------------

export type RelayModule = NostrNodeModule<
  ClientToRelayMessage,
  RelayEventTypeRecord,
  Relay
>;
