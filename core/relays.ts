import type { Stringified } from "./types.ts";
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
} from "./protocol.d.ts";
import { NonExclusiveWritableStream } from "./streams.ts";
import { LazyWebSocket } from "./websockets.ts";
import {
  NostrNode,
  NostrNodeConfig,
  NostrNodeEvent,
  NostrNodeModule,
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

export interface RelayLike
  extends NonExclusiveWritableStream<ClientToRelayMessage> {
  subscribe: Relay["subscribe"];
  publish: Relay["publish"];
}

export interface RelayConfig
  extends NostrNodeConfig<RelayFunctionParameterTypeRecord> {
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
  EventDataTypeRecord,
  RelayFunctionParameterTypeRecord
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
        // TODO: Validate message.
        const message = JSON.parse(ev.data) as RelayToClientMessage;
        return this.callFunction("handleRelayToClientMessage", {
          message,
          relay: this,
        });
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
      relay: this,
    };
    return new ReadableStream<NostrEvent<K>>({
      start: (controller) => {
        this.addEventListener(
          context.id,
          (ev) =>
            this.callFunction("handleSubscriptionMessage", {
              message: ev.data,
              controller,
              ...context,
            }),
        );
        this.callFunction("startSubscription", { controller, ...context });
      },
      pull: async () => {
        await this.ws.ready();
        // TODO: backpressure
      },
      cancel: (reason) => {
        return this.callFunction("closeSubscription", { reason, ...context });
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
    // We await the response instead of awaiting this
    this.callFunction("publishEvent", { event, relay: this });

    return new Promise<void>((resolve, reject) => {
      this.addEventListener(
        event.id,
        (ev) =>
          resolve(this.callFunction("handlePublicationMessage", {
            message: ev.data,
            event,
            relay: this,
          })),
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
// Events
// ----------------------

type EventDataTypeRecord =
  & {
    [T in SubscriptionId]: SubscriptionMessage;
  }
  & {
    [T in EventId]: PublicationMessage;
  };

export class RelaySubscriptionEvent extends NostrNodeEvent<
  EventDataTypeRecord,
  SubscriptionId
> {
  constructor(
    type: SubscriptionId,
    init: MessageEventInit<SubscriptionMessage>,
  ) {
    super(type, init);
  }
}

export class PublicationEvent extends NostrNodeEvent<
  EventDataTypeRecord,
  EventId
> {
  constructor(
    type: EventId,
    init: MessageEventInit<PublicationMessage>,
  ) {
    super(type, init);
  }
}

// ----------------------
// Functions
// ----------------------

export type RelayModule = NostrNodeModule<RelayFunctionParameterTypeRecord>;

type RelayFunctionParameterTypeRecord = {
  [K in keyof FunctionParameterTypeRecord]:
    & FunctionParameterTypeRecord[K]
    & RelayFunctionContext;
};

type FunctionParameterTypeRecord = {
  "handleRelayToClientMessage": {
    message: RelayToClientMessage;
  };
  "handleSubscriptionMessage": {
    message: SubscriptionMessage;
    controller: ReadableStreamDefaultController<NostrEvent>;
  } & SubscriptionContext;
  "handlePublicationMessage": {
    message: PublicationMessage;
    event: NostrEvent;
  };
  "publishEvent": {
    event: NostrEvent;
  };
  "startSubscription": {
    controller: ReadableStreamDefaultController<NostrEvent>;
  } & SubscriptionContext;
  "closeSubscription": {
    reason: unknown;
  } & SubscriptionContext;
};

interface RelayFunctionContext {
  relay: Relay;
}

interface SubscriptionContext {
  id: SubscriptionId;
  filters: SubscriptionFilter[];
  options: SubscriptionOptions;
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
