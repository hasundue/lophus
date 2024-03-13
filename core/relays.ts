import type { Stringified } from "@lophus/lib/types";
import type {
  ClientToRelayMessage,
  EventId,
  EventKind,
  NostrEvent,
  RelayToClientMessage,
  RelayToClientMessageType,
  RelayUrl,
  SubscriptionFilter,
  SubscriptionId,
} from "./protocol.ts";
import { LazyWebSocket } from "./websockets.ts";
import { NostrNodeBase, NostrNodeConfig, NostrNodeModule } from "./nodes.ts";

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
export class Relay extends NostrNodeBase<
  ClientToRelayMessage,
  RelayEventTypeRecord
> {
  declare ws: LazyWebSocket;
  declare config: RelayConfig;

  constructor(
    init: RelayUrl | RelayInit,
    options?: RelayOptions,
  ) {
    const url = typeof init === "string" ? init : init.url;
    const config = { nbuffer: 64, modules: [], ...options };
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
        return this.dispatch("message", message);
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
    const resubscribe = () => this.dispatch("resubscribe", { ...context });
    return new ReadableStream<NostrEvent<K>>({
      start: (controller) => {
        this.addEventListener(
          context.id,
          () => this.ws.removeEventListener("close", resubscribe),
        );
        this.dispatch("subscribe", { ...context, controller });
      },
      pull: () => {
        this.ws.addEventListener("close", resubscribe, { once: true });
        this.ws.ready();
      },
      cancel: (reason) => {
        this.dispatch("unsubscribe", { ...context, reason });
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
      this.dispatch("publish", { event, resolve, reject });
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

export interface RelayLike
  extends Pick<Relay, "writable" | "send" | "subscribe" | "publish" | "close"> {
  readonly config: RelayLikeConfig;
}

export type RelayLikeConfig = Pick<RelayConfig, "name" | "read" | "write">;
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

type SubscriptionMessage = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends
    SubscriptionId ? RelayToClientMessage<T> : never;
}[RelayToClientMessageType];

type PublicationMessage = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends EventId
    ? RelayToClientMessage<T>
    : never;
}[RelayToClientMessageType];

export interface RelayEventTypeRecord {
  message: RelayToClientMessage;
  subscribe: SubscriptionContextWithController;
  resubscribe: SubscriptionContext;
  unsubscribe: SubscriptionContextWithReason;
  publish: PublicationContext;
  [id: SubscriptionId]: SubscriptionMessage;
  [id: EventId]: PublicationMessage;
}

export type RelayEventType = keyof RelayEventTypeRecord;

// ----------------------
// Modules
// ----------------------

export type RelayModule = NostrNodeModule<
  ClientToRelayMessage,
  RelayEventTypeRecord,
  Relay
>;
