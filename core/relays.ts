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
export class Relay extends NostrNode<ClientToRelayMessage> {
  declare ws: LazyWebSocket;

  declare addEventListener: <
    T extends RelayEventType = RelayEventType,
    K extends EventKind = EventKind,
  >(
    type: T,
    listener:
      | RelayEventListener<T, K>
      | RelayEventListenerObject<T, K>
      | null,
    options?: boolean | AddEventListenerOptions,
  ) => void;

  declare removeEventListener: <
    T extends RelayEventType,
    K extends EventKind = EventKind,
  >(
    type: T,
    listener:
      | RelayEventListener<T, K>
      | RelayEventListenerObject<T, K>
      | null,
    options?: EventListenerOptions | boolean,
  ) => void;

  declare dispatchEvent: <
    T extends RelayEventType,
    K extends EventKind = EventKind,
  >(event: RelayEvent<T, K>) => boolean;

  readonly config: Readonly<RelayConfig>;

  protected readonly handlers: RelayHandlerSet = {};
  protected readonly ready: Promise<void>;

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
      url, name: new URL(url).hostname, nips: [1],
      read: true, write: true, nbuffer: 10, ...opts,
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
    const sid = (options.id ?? crypto.randomUUID()) as SubscriptionId;
    options.realtime ??= true;
    options.nbuffer ??= this.config.nbuffer;

    function request() {
      return messenger.write(["REQ", sid, ...[filter].flat()]);
    }
    const messenger = this.getWriter();

    return new ReadableStream<NostrEvent<K>>({
      start: (controller) => {
        this.addEventListener(
          `${sid}:receive`,
          (ev: SubscriptionEvent<K>) =>
            this.handle("SubscriptionMessage", {
              message: ev.data,
              controller,
              options,
              relay: this,
            }),
        );
        if (this.ws.readyState === WebSocket.OPEN) {
          return request();
        }
        this.ws.addEventListener("open", request);
      },
      pull: async () => {
        await this.ws.ready();
        // TODO: backpressure
      },
      cancel: async () => {
        this.ws.removeEventListener("open", request);
        if (this.ws.readyState === WebSocket.OPEN) {
          await messenger.write(["CLOSE", sid]);
        }
        return messenger.close();
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
        (ev: PublicationEvent<K>) =>
          resolve(
            this.handle("PublicationMessage", {
              message: ev.data,
              event,
              relay: this,
            } as PublicationMessageContext<K>),
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
  K extends EventKind = EventKind,
> // deno-lint-ignore no-explicit-any
 = (this: Relay, ev: RelayEvent<T, K>) => any;

type RelayEventListenerObject<
  T extends RelayEventType = RelayEventType,
  K extends EventKind = EventKind,
> = { // deno-lint-ignore no-explicit-any
  handleEvent(this: Relay, ev: RelayEvent<T, K>): any;
};

type RelayEvent<
  T extends RelayEventType = RelayEventType,
  K extends EventKind = EventKind,
> = T extends SubscriptionEventType
  ? SubscriptionEvent<K> | SubscriptionEvent<K>
  : T extends PublicationEventType ? PublicationEvent<K>
  : never;

export class SubscriptionEvent<
  K extends EventKind,
> extends MessageEvent<SubscriptionMessage<K>> {
  constructor(
    type: SubscriptionEventType,
    init?: MessageEventInit<SubscriptionMessage<K>>,
  ) {
    super(type, init);
  }
}

export class PublicationEvent<
  K extends EventKind,
> extends MessageEvent<PublicationMessage<K>> {
  constructor(
    type: PublicationEventType,
    init?: MessageEventInit<PublicationMessage<K>>,
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

export interface RelayExtensionModule<K extends EventKind = EventKind> {
  default: Partial<RelayHandlers<K>>;
}

/**
 * A set of handlers for relay events
 */
export interface RelayHandlers<K extends EventKind = EventKind> {
  handleRelayToClientMessage: RelayToClientMessageHandler<K>;
  handleSubscriptionMessage: SubscriptionMessageHandler<K>;
  handlePublicationMessage: PublicationMessageHandler<K>;
  handlePublish: PublishHandler<K>;
  handleStartSubscription: StartSubscriptionHandler<K>;
  handleCloseSubscription: CloseSubscriptionHandler<K>;
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
  K extends EventKind = EventKind,
  T extends RelayToClientMessageType = RelayToClientMessageType,
> = (
  context: RelayToClientMessageContext<K, T>,
) => void;

export interface RelayToClientMessageContext<
  K extends EventKind = EventKind,
  T extends RelayToClientMessageType = RelayToClientMessageType,
> extends RelayEventContext {
  message: RelayToClientMessage<T, K>;
}

/**
 * A handler for responses to subscription requests
 */
type SubscriptionMessage<K extends EventKind = EventKind> = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T, K>[1] extends
    SubscriptionId ? RelayToClientMessage<T, K> : never;
}[RelayToClientMessageType];

type SubscriptionMessageHandler<K extends EventKind = EventKind> = (
  context: SubscriptionMessageContext<K>,
) => void;

interface SubscriptionMessageContext<K extends EventKind>
  extends RelayEventContext {
  message: SubscriptionMessage<K>;
  options: SubscriptionOptions;
  controller: ReadableStreamDefaultController<NostrEvent<K>>;
}

/**
 * A handler for responses to publications
 */
type PublicationMessage<K extends EventKind = EventKind> = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends EventId
    ? RelayToClientMessage<T, K>
    : never;
}[RelayToClientMessageType];

type PublicationMessageHandler<K extends EventKind = EventKind> = (
  context: PublicationMessageContext<K>,
) => void;

interface PublicationMessageContext<K extends EventKind>
  extends RelayEventContext {
  message: PublicationMessage<K>;
  event: NostrEvent<K>;
}

/**
 * A handler to publish events to the relay
 */
type PublishHandler<K extends EventKind = EventKind> = (
  context: PublishContext<K>,
) => void;

interface PublishContext<K extends EventKind> extends RelayEventContext {
  event: NostrEvent<K>;
}

/**
 * A handler to start a subscription
 */
type StartSubscriptionHandler<K extends EventKind = EventKind> = (
  context: StartSubscriptionContext<K>,
) => void;

interface StartSubscriptionContext<K extends EventKind>
  extends RelayEventContext {
  controller: ReadableStreamDefaultController<NostrEvent<K>>;
}

/**
 * A handler to close a subscription
 */
type CloseSubscriptionHandler<K extends EventKind = EventKind> = (
  context: CloseSubscriptionContext<K>,
) => void;

interface CloseSubscriptionContext<K extends EventKind>
  extends RelayEventContext {
  controller: ReadableStreamDefaultController<NostrEvent<K>>;
}
