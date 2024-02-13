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
  NostrNodeModuleInstaller,
} from "./nodes.ts";
import { NIPs } from "./nips.ts";

// ----------------------
// NIPs
// ----------------------

const nips = await NIPs.import<RelayModule>(import.meta.url, "../nips");

// ----------------------
// Errors
// ----------------------

export class EventRejected extends Error {}
export class ConnectionClosed extends Error {}

// ----------------------
// Interfaces
// ----------------------

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
  id?: string;
  realtime?: boolean;
  nbuffer?: number;
}

/**
 * A class that represents a remote Nostr Relay.
 */
export class Relay extends NostrNode<
  ClientToRelayMessage,
  RelayEvent
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
      modules: nips.concat(options?.modules ?? []),
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
        return this.dispatchEvent(new MessageReceived(message));
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
        this.dispatchEvent(new StartSubscription({ ...context, controller }));
      },
      pull: (controller) => {
        this.dispatchEvent(new PullEvent({ ...context, controller }));
      },
      cancel: (reason) => {
        this.dispatchEvent(new CloseSubscription({ ...context, reason }));
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
        new PublishEvent({ event, resolve, reject }),
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
// Modules
// ----------------------

export type RelayModule<
  M extends NostrNodeEvent = never,
> = NostrNodeModule<ClientToRelayMessage, RelayEvent | M>;

export type RelayModuleInstaller<
  M extends NostrNodeEvent = never,
> = NostrNodeModuleInstaller<ClientToRelayMessage, RelayEvent | M>;

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

export type RelayEvent = MessageReceived | SubscriptionEvent | PublishEvent;

export class MessageReceived extends NostrNodeEvent<
  "message",
  RelayToClientMessage
> {
  constructor(data: RelayToClientMessage) {
    super("message", { data });
  }
}

export type SubscriptionEvent =
  | StartSubscription
  | PullEvent
  | CloseSubscription;

export class StartSubscription extends NostrNodeEvent<
  "subscribe",
  SubscriptionContextWithController
> {
  constructor(data: SubscriptionContextWithController) {
    super("subscribe", { data });
  }
}

export class PullEvent extends NostrNodeEvent<
  "pull",
  SubscriptionContextWithController
> {
  constructor(data: SubscriptionContextWithController) {
    super("pull", { data });
  }
}

export class CloseSubscription extends NostrNodeEvent<
  "unsubscribe",
  SubscriptionContextWithReason
> {
  constructor(data: SubscriptionContextWithReason) {
    super("unsubscribe", { data });
  }
}

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

export class PublishEvent extends NostrNodeEvent<
  "publish",
  PublicationContext
> {
  constructor(data: PublicationContext) {
    super("publish", { data });
  }
}

export interface PublicationContext {
  event: NostrEvent;
  resolve: () => void;
  reject: (reason: unknown) => void;
}
