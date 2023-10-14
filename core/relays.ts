import type { Stringified } from "./types.ts";
import type {
  ClientToRelayMessage,
  EventId,
  EventKind,
  NIP,
  NostrEvent,
  RelayToClientMessage,
  RelayToClientMessageType,
  RelayUrl,
  SubscriptionFilter,
  SubscriptionId,
} from "./protocol.d.ts";
import { NonExclusiveWritableStream } from "./streams.ts";
import { NostrNode, NostrNodeConfig, NostrNodeExtension } from "./nodes.ts";
import { LazyWebSocket } from "./websockets.ts";

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

export interface RelayConfig extends NostrNodeConfig {
  url: RelayUrl;
  name: string;
  nips: NIP[];
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
  RelayEventType,
  FunctionParameterTypeRecord
> {
  declare ws: LazyWebSocket;
  readonly config: Readonly<RelayConfig>;

  constructor(
    init: RelayUrl | RelayInit,
    opts?: RelayOptions,
  ) {
    const url = typeof init === "string" ? init : init.url;
    super(new LazyWebSocket(url), opts);
    // deno-fmt-ignore
    this.config = {
      logger: {}, nbuffer: 10, url, name: new URL(url).hostname,
      nips: [1], read: true, write: true, ...opts,
    };
    this.ws.addEventListener(
      "message",
      (ev: MessageEvent<Stringified<RelayToClientMessage>>) => {
        // TODO: Validate message.
        const message = JSON.parse(ev.data) as RelayToClientMessage;
        return this.exec("handleRelayToClientMessage", {
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
          (ev: SubscriptionEvent) =>
            this.exec("handleSubscriptionMessage", {
              message: ev.data,
              controller,
              ...context,
            }),
        );
        this.exec("startSubscription", { controller, ...context });
      },
      pull: async () => {
        await this.ws.ready();
        // TODO: backpressure
      },
      cancel: (reason) => {
        return this.exec("closeSubscription", { reason, ...context });
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
    this.exec("publishEvent", { event, relay: this });

    return new Promise<void>((resolve, reject) => {
      this.addEventListener(
        event.id,
        (ev: PublicationEvent) =>
          resolve(
            this.exec("handlePublicationMessage", {
              message: ev.data,
              event,
              relay: this,
            }),
          ),
        { once: true, signal: this.aborter.signal },
      );
      this.ws.addEventListener(
        "close",
        () => reject(new ConnectionClosed()),
        { once: true, signal: this.aborter.signal },
      );
    });
  }
}

// ----------------------
// Events
// ----------------------

type RelayEventType = SubscriptionId | EventId;

type RelayEvent<
  T extends RelayEventType = RelayEventType,
> = T extends SubscriptionEventType ? SubscriptionEvent
  : T extends PublicationEventType ? PublicationEvent
  : never;

export class SubscriptionEvent extends MessageEvent<SubscriptionMessage> {
  constructor(
    type: SubscriptionEventType,
    init?: MessageEventInit<SubscriptionMessage>,
  ) {
    super(type, init);
  }
}

export class PublicationEvent extends MessageEvent<PublicationMessage> {
  constructor(
    type: PublicationEventType,
    init?: MessageEventInit<PublicationMessage>,
  ) {
    super(type, init);
  }
}

// ----------------------
// Functions
// ----------------------

export type RelayExtension = NostrNodeExtension<FunctionParameterTypeRecord>;

type FunctionParameterTypeRecord = {
  [K in keyof _FunctionParameterTypeRecord]:
    & _FunctionParameterTypeRecord[K]
    & RelayFunctionContext;
};

type _FunctionParameterTypeRecord = {
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

/**
 * A handler for general messages from the relay
 */
export type RelayToClientMessageHandler<
  T extends RelayToClientMessageType = RelayToClientMessageType,
> = (
  context: RelayToClientMessageContext<T>,
) => void;

export interface RelayToClientMessageContext<
  T extends RelayToClientMessageType = RelayToClientMessageType,
> extends RelayFunctionContext {
  message: RelayToClientMessage<T>;
}

/**
 * A handler for responses to subscription requests
 */
type SubscriptionMessage = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends
    SubscriptionId ? RelayToClientMessage<T> : never;
}[RelayToClientMessageType];

/**
 * A handler for responses to publications
 */
type PublicationMessage = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends EventId
    ? RelayToClientMessage<T>
    : never;
}[RelayToClientMessageType];
