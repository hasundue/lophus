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
import { NostrNode, NostrNodeConfig } from "./nodes.ts";
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
export class Relay extends NostrNode<ClientToRelayMessage, RelayEventType> {
  declare ws: LazyWebSocket;

  declare addEventListener: <
    T extends RelayEventType = RelayEventType,
  >(
    type: T,
    listener:
      | RelayEventListener<T>
      | RelayEventListenerObject<T>
      | null,
    options?: boolean | AddEventListenerOptions,
  ) => void;

  declare removeEventListener: <
    T extends RelayEventType,
  >(
    type: T,
    listener:
      | RelayEventListener<T>
      | RelayEventListenerObject<T>
      | null,
    options?: EventListenerOptions | boolean,
  ) => void;

  declare dispatchEvent: <
    T extends RelayEventType,
  >(event: RelayEvent<T>) => boolean;

  readonly config: Readonly<RelayConfig>;

  protected readonly handlers: RelayHandlerSet = {};
  protected readonly ready: Promise<void>;

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
        return this.handle("RelayToClientMessage", {
          message,
          relay: this,
        });
      },
    );
    this.ready = this.addRelayHandlers();
  }

  protected async addRelayHandlers(): Promise<void> {
    for await (const nip of this.config.nips) {
      const { default: handlers } = await import(
        new URL(`../nips/${nip}/relays.ts`, import.meta.url).href
      ) as RelayExtensionModule;
      for (const name in handlers) {
        const key = name as keyof RelayHandlerSet;
        this.addRelayHandler(key, handlers[key]!);
      }
    }
  }

  protected addRelayHandler<K extends keyof RelayHandlerSet>(
    key: K,
    handler: RelayHandlers[K],
  ): void {
    if (!this.handlers[key]) {
      this.handlers[key] = new Set([handler]) as RelayHandlerSet[K];
    }
    this.handlers[key]!.add(handler);
  }

  protected async handle<T extends RelayHandlerTarget>(
    target: T,
    context: Parameters<RelayHandlers[`handle${T}`]>[0],
  ): Promise<void> {
    await this.ready;
    const handlers = this.handlers[`handle${target}`];
    if (handlers) {
      await Promise.all(
        // @ts-ignore FIXME: TypeScript doesn't infer the type of `context` correctly
        [...handlers].map((handler) => handler(context)),
      );
    }
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
          `${context.id}:receive`,
          (ev: SubscriptionEvent) =>
            this.handle("SubscriptionMessage", {
              message: ev.data,
              controller,
              ...context,
            }),
        );
        this.handle("StartSubscription", { controller, ...context });
      },
      pull: async () => {
        await this.ws.ready();
        // TODO: backpressure
      },
      cancel: (reason) => {
        return this.handle("CloseSubscription", { reason, ...context });
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
    this.handle("Publish", { event, relay: this });

    return new Promise<void>((resolve, reject) => {
      this.addEventListener(
        `${event.id}:response`,
        (ev: PublicationEvent) =>
          resolve(
            this.handle("PublicationMessage", {
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

type RelayEventType = SubscriptionEventType | PublicationEventType;

type SubscriptionEventType = `${SubscriptionId}:${SubscriptionEventKind}`;
type PublicationEventType = `${EventId}:${PublicationEventKind}`;

type SubscriptionEventKind = "start" | "receive" | "pull" | "cancel";
type PublicationEventKind = "publish" | "response";

type RelayEventListener<
  T extends RelayEventType = RelayEventType,
> // deno-lint-ignore no-explicit-any
 = (this: Relay, ev: RelayEvent<T>) => any;

type RelayEventListenerObject<
  T extends RelayEventType = RelayEventType,
> = { // deno-lint-ignore no-explicit-any
  handleEvent(this: Relay, ev: RelayEvent<T>): any;
};

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
// Event handlers
// ----------------------

type RelayHandlerTarget =
  | "RelayToClientMessage"
  | "SubscriptionMessage"
  | "PublicationMessage"
  | "Publish"
  | "StartSubscription"
  | "CloseSubscription";

type RelayHandlerSet = {
  [K in keyof RelayHandlers]?: Set<RelayHandlers[K]>;
};

export interface RelayExtensionModule {
  default: Partial<RelayHandlers>;
}

/**
 * A set of handlers for relay events
 */
export interface RelayHandlers {
  handleRelayToClientMessage: RelayToClientMessageHandler;
  handleSubscriptionMessage: SubscriptionMessageHandler;
  handlePublicationMessage: PublicationMessageHandler;
  handlePublish: PublishHandler;
  handleStartSubscription: StartSubscriptionHandler;
  handleCloseSubscription: CloseSubscriptionHandler;
}

/**
 * Common context for all relay events
 */
interface RelayEventContext {
  relay: Relay;
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
> extends RelayEventContext {
  message: RelayToClientMessage<T>;
}

/**
 * A handler for responses to subscription requests
 */
type SubscriptionMessage = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends
    SubscriptionId ? RelayToClientMessage<T> : never;
}[RelayToClientMessageType];

type SubscriptionMessageHandler = (
  context: SubscriptionMessageContext,
) => void;

interface SubscriptionContext extends RelayEventContext {
  id: SubscriptionId;
  filters: SubscriptionFilter[];
  options: SubscriptionOptions;
}

interface SubscriptionMessageContext extends SubscriptionContext {
  message: SubscriptionMessage;
  controller: ReadableStreamDefaultController<NostrEvent>;
}

/**
 * A handler for responses to publications
 */
type PublicationMessage = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends EventId
    ? RelayToClientMessage<T>
    : never;
}[RelayToClientMessageType];

type PublicationMessageHandler = (
  context: PublicationMessageContext,
) => void;

interface PublicationMessageContext extends RelayEventContext {
  message: PublicationMessage;
  event: NostrEvent;
}

/**
 * A handler to publish events to the relay
 */
type PublishHandler = (context: PublishContext) => void;

interface PublishContext extends RelayEventContext {
  event: NostrEvent;
}

/**
 * A handler to start a subscription
 */
type StartSubscriptionHandler = (context: StartSubscriptionContext) => void;

interface StartSubscriptionContext extends SubscriptionContext {
  controller: ReadableStreamDefaultController<NostrEvent>;
}

/**
 * A handler to close a subscription
 */
type CloseSubscriptionHandler = (
  context: CloseSubscriptionContext,
) => void;

interface CloseSubscriptionContext extends SubscriptionContext {
  reason: unknown;
}
