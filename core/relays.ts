import type { PromiseCallbackRecord } from "@lophus/lib/types";
import { LazyWebSocket } from "@lophus/lib/websockets";
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
import { Node, NodeConfig } from "./nodes.ts";

//---------
// Errors
//---------

export class ConnectionClosed extends Error {}
export class EventRejected extends Error {}
export class SubscriptionClosed extends Error {}

//-------------
// Interfaces
//-------------

export interface RelayConfig extends NodeConfig {
  name: string;
  read: boolean;
  url: RelayUrl;
  write: boolean;
}

export type RelayOptions = Partial<RelayConfig>;

export interface SubscriptionOptions {
  id?: string;
  nbuffer?: number;
  realtime?: boolean;
}

//------------------------
// Messages and contexts
//------------------------

export interface SubscriptionContext {
  id: SubscriptionId;
  filters: SubscriptionFilter[];
  realtime: boolean;
}

export interface PublicationContext extends PromiseCallbackRecord<void> {
  event: NostrEvent;
}

type SubscriptionMessage = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends
    SubscriptionId ? RelayToClientMessage<T>
    : never;
}[RelayToClientMessageType];

type PublicationMessage = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends EventId
    ? RelayToClientMessage<T>
    : never;
}[RelayToClientMessageType];

//---------
// Events
//---------

export interface RelayEventTypeRecord {
  message: RelayToClientMessage;
  subscribe: SubscriptionContext & {
    controller: ReadableStreamDefaultController<NostrEvent>;
  };
  resubscribe: SubscriptionContext;
  unsubscribe: SubscriptionContext & { reason: unknown };
  publish: PublicationContext;
  [id: SubscriptionId]: SubscriptionMessage;
  [id: EventId]: PublicationMessage;
}

/**
 * A class that represents a remote Nostr Relay.
 */
export class Relay extends Node<
  ClientToRelayMessage,
  RelayEventTypeRecord
> {
  declare ws: LazyWebSocket;
  declare config: RelayConfig;

  constructor(
    url: RelayUrl,
    options?: RelayOptions,
  ) {
    super(new LazyWebSocket(url), options);
    this.config = {
      ...this.config,
      name: new URL(url).hostname,
      read: true,
      url,
      write: true,
      ...options,
    };
    this.ws.addEventListener("message", (ev: MessageEvent<string>) => {
      const message = JSON.parse(ev.data) as RelayToClientMessage;
      // TODO: Validate the message.
      this.dispatch("message", message);
    });
  }

  subscribe<K extends EventKind>(
    filter: SubscriptionFilter<K> | SubscriptionFilter<K>[],
    options: Partial<SubscriptionOptions> = {},
  ): ReadableStream<NostrEvent<K>> {
    const context = {
      id: (options.id ?? crypto.randomUUID()) as SubscriptionId,
      filters: [filter].flat(),
      realtime: options.realtime ?? true,
    };
    const resubscribe = () => this.dispatch("resubscribe", context);
    return new ReadableStream<NostrEvent<K>>(
      {
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
      },
      { highWaterMark: options.nbuffer ?? this.config.nbuffer },
    );
  }

  /**
   * Publish an event to the relay and wait for a response.
   *
   * @throws {EventRejected} If the event is rejected by the relay
   * @throws {ConnectionClosed} If the WebSocket connection to the relay is closed
   */
  publish<K extends EventKind>(event: NostrEvent<K>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.dispatch("publish", { event, resolve, reject });
      this.ws.addEventListener(
        "close",
        () => reject(new ConnectionClosed()),
        { once: true },
      );
    });
  }
}

//-------------
// RelayLikes
//-------------

export interface RelayLike
  extends Pick<Relay, "writable" | "send" | "subscribe" | "publish" | "close"> {
  readonly config: RelayLikeConfig;
}

export type RelayLikeConfig = Pick<RelayConfig, "name" | "read" | "write">;
export type RelayLikeOptions = Partial<RelayLikeConfig>;
