import { NIP } from "../nips/01.ts";
import type {
  ClientToRelayMessage,
  EventId,
  EventKind,
  NostrEvent,
  RelayToClientMessage,
  RelayToClientMessageContent,
  RelayToClientMessageType,
  RelayUrl,
  SubscriptionFilter,
  SubscriptionId,
} from "../nips/01.ts";
import type { Stringified } from "./types.ts";
import { Enum } from "./utils.ts";
import { NonExclusiveWritableStream } from "./streams.ts";
import { NostrNode, NostrNodeConfig } from "./nodes.ts";
import { LazyWebSocket } from "./websockets.ts";

// ----------------------
// Errors
// ----------------------

export class EventRejected extends Error {}
export class RelayClosed extends Error {}

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

  protected readonly handlers = {
    RelayToClientMessage: new Set<RelayToClientMessageHandler>(),
    SubscriptionMessage: new Set<SubscriptionMessageHandler>(),
    PublicationMessage: new Set<PublicationMessageHandler>(),
  };
  protected readonly ready: Promise<true>;

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
    this.ws.addEventListener(
      "message",
      (ev: MessageEvent<Stringified<RelayToClientMessage>>) => {
        // TODO: Validate message.
        const message = JSON.parse(ev.data) as RelayToClientMessage;
        return this.handleRelayToClientMessage({ message });
      },
    );
    this.ready = this.addRelayHandlers();
  }

  protected async addRelayHandlers(): Promise<true> {
    for await (const nip of Enum.numbers(NIP)) {
      const module = await import(
        new URL(`../nips/${nip}/relays.ts`, import.meta.url).href
      ) as RelayExtensionModule;
      const handlers = module.default;
      if (handlers.handleRelayToClientMessage) {
        this.handlers.RelayToClientMessage.add(
          handlers.handleRelayToClientMessage,
        );
      }
      if (handlers.handleSubscriptionMessage) {
        this.handlers.SubscriptionMessage.add(
          handlers.handleSubscriptionMessage,
        );
      }
      if (handlers.handlePublicationMessage) {
        this.handlers.PublicationMessage.add(
          handlers.handlePublicationMessage,
        );
      }
    }
    return true;
  }

  protected async handleRelayToClientMessage(
    context: RelayToClientMessageContext,
  ): Promise<void> {
    await this.ready;
    await Promise.all(
      [...this.handlers.RelayToClientMessage].map((handler) =>
        handler.bind(this)(context)
      ),
    );
  }

  protected async handleSubscriptionMessage(
    context: SubscriptionMessageContext,
  ): Promise<void> {
    await this.ready;
    await Promise.all(
      [...this.handlers.SubscriptionMessage].map((handler) =>
        handler.bind(this)(context)
      ),
    );
  }

  protected async handlePublicationMessage(
    context: PublicationMessageContext,
  ): Promise<void> {
    await this.ready;
    await Promise.all(
      [...this.handlers.PublicationMessage].map((handler) =>
        handler.bind(this)(context)
      ),
    );
  }

  subscribe<K extends EventKind>(
    filter: SubscriptionFilter<K> | SubscriptionFilter<K>[],
    opts: Partial<SubscriptionOptions> = {},
  ): ReadableStream<NostrEvent<K>> {
    const sid = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    opts.realtime ??= true;
    opts.nbuffer ??= this.config.nbuffer;

    function request() {
      return messenger.write(["REQ", sid, ...[filter].flat()]);
    }
    const messenger = this.getWriter();

    return new ReadableStream<NostrEvent<K>>({
      start: (controller) => {
        this.addEventListener(
          sid,
          (ev: SubscriptionEvent<K>) =>
            this.handleSubscriptionMessage({ message: ev.data, controller }),
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
    }, new CountQueuingStrategy({ highWaterMark: opts.nbuffer }));
  }

  async publish<K extends EventKind>(event: NostrEvent<K>): Promise<void> {
    const writer = this.getWriter();
    await writer.ready;

    // We don't await this because it blocks for a long time
    writer.write(["EVENT", event]);

    const message = await new Promise<PublicationMessage<K>>((resolve) =>
      this.addEventListener(
        event.id,
        (ev: PublicationEvent<K>) => resolve(ev.data),
        { once: true },
      )
    );
    return this.handlePublicationMessage({ message, event });
  }
}

// ----------------------
// Events
// ----------------------

export type RelayEventType = SubscriptionId | EventId;

export type RelayEventListener<
  T extends RelayEventType = RelayEventType,
  K extends EventKind = EventKind,
> // deno-lint-ignore no-explicit-any
 = (this: Relay, ev: RelayEvent<T, K>) => any;

export type RelayEventListenerObject<
  T extends RelayEventType = RelayEventType,
  K extends EventKind = EventKind,
> = { // deno-lint-ignore no-explicit-any
  handleEvent(this: Relay, ev: RelayEvent<T, K>): any;
};

export type RelayEvent<
  T extends RelayEventType = RelayEventType,
  K extends EventKind = EventKind,
> = T extends SubscriptionId ? SubscriptionEvent<K> | SubscriptionEvent<K>
  : T extends EventId ? PublicationEvent<K>
  : never;

export class SubscriptionEvent<
  K extends EventKind,
> extends MessageEvent<SubscriptionMessage<K>> {}

export class PublicationEvent<
  K extends EventKind,
> extends MessageEvent<PublicationMessage<K>> {}

// ----------------------
// Extensions
// ----------------------

export interface RelayExtensionModule {
  default: RelayHandlers;
}

export interface RelayHandlers {
  handleRelayToClientMessage?: RelayToClientMessageHandler;
  handleSubscriptionMessage?: SubscriptionMessageHandler;
  handlePublicationMessage?: PublicationMessageHandler;
}

/**
 * A handler for general messages from the relay
 */
export type RelayToClientMessageHandler<
  T extends RelayToClientMessageType = RelayToClientMessageType,
  K extends EventKind = EventKind,
> = (
  this: Relay,
  context: RelayToClientMessageContext<T, K>,
) => void;

export interface RelayToClientMessageContext<
  T extends RelayToClientMessageType = RelayToClientMessageType,
  K extends EventKind = EventKind,
> {
  message: RelayToClientMessage<T, K>;
}

/**
 * A handler for responses to subscription requests
 */
export type SubscriptionMessage<K extends EventKind = EventKind> = {
  [T in RelayToClientMessageType]: RelayToClientMessageContent<K>[T][0] extends
    SubscriptionId ? RelayToClientMessage<T, K> : never;
}[RelayToClientMessageType];

export type SubscriptionMessageType = SubscriptionMessage[0];

export type SubscriptionMessageHandler = (
  this: Relay,
  context: SubscriptionMessageContext,
) => void;

export interface SubscriptionMessageContext {
  message: SubscriptionMessage;
  controller: ReadableStreamDefaultController<NostrEvent>;
}

/**
 * A handler for responses to publications
 */
export type PublicationMessage<K extends EventKind = EventKind> = {
  [T in RelayToClientMessageType]: RelayToClientMessageContent[T][0] extends
    EventId ? RelayToClientMessage<T, K> : never;
}[RelayToClientMessageType];

export type PublicationMessageType = PublicationMessage[0];

export type PublicationMessageHandler = (
  this: Relay,
  context: PublicationMessageContext,
) => void;

export interface PublicationMessageContext {
  message: PublicationMessage;
  event: NostrEvent;
}
