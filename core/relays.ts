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

export interface RelayLike
  extends NonExclusiveWritableStream<ClientToRelayMessage> {
  subscribe: Relay["subscribe"];
  publish: Relay["publish"];
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
  ) => void;
  // declare dispatchEvent: <
  //   T extends RelayEventType,
  //   K extends EventKind = EventKind,
  // >(event: RelayEvent<T, K>) => boolean;

  readonly config: Readonly<RelayConfig>;
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
      url, name: new URL(url).hostname, read: true, write: true, nbuffer: 10, ...opts,
    };
    this.ws.addEventListener(
      "message",
      (ev: MessageEvent<Stringified<RelayToClientMessage>>) => {
        // TODO: Validate message.
        const msg = JSON.parse(ev.data) as RelayToClientMessage;

        const type = msg[0];
        this.dispatchEvent(new RelayToClientMessageEvent(type, { data: msg }));
      },
    );
    this.ready = this.installExtensions();
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
      start: (controller) => {
        this.addEventListener(
          sid,
          (ev: SubscriptionEvent<K>) => {
            this.handleSubscriptionListener(this, ev);
          },
        );
        if (this.ws.readyState === WebSocket.OPEN) {
          return request();
        }
        this.ws.addEventListener("open", request);
      },
      pull: async () => {
        await this.ready;
        await this.ws.ready();
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

    const channel = new BroadcastChannel(event.id);
    const msg = await new Promise<ResponseMessage<K>>((resolve) =>
      channel.addEventListener(
        "message",
        (ev: MessageEvent<ResponseMessage>) => {
          channel.close();
          resolve(ev.data);
        },
      )
    );
    const type = msg[0];
    return this.handleResponseEvent[type](msg);
  }
}

// ----------------------
// Events
// ----------------------

/**
 * A union of all possible JavaScript events that can be emitted by a relay.
 */
export type RelayEventType =
  | RelayToClientMessageType
  | SubscriptionId
  | EventId;

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
> = T extends RelayToClientMessageType ? RelayToClientMessageEvent<T, K>
  : T extends SubscriptionId ? SubscriptionEvent<K>
  : T extends EventId ? PublicationEvent<K>
  : never;

/**
 * A message from the relay to the client.
 */
export class RelayToClientMessageEvent<
  T extends RelayToClientMessageType = RelayToClientMessageType,
  K extends EventKind = EventKind,
> extends MessageEvent<RelayToClientMessage<T, K>> {}

export class SubscriptionMessageEvent {}

export class SubscriptionEvent<
  K extends EventKind,
> extends MessageEvent<SubscriptionEventData<K>> {}

export interface SubscriptionEventData<K extends EventKind = EventKind> {
  id: SubscriptionId;
  event: NostrEvent<K>;
  controller: ReadableStreamDefaultController<NostrEvent<K>>;
}

export type SubscriptionEventListener<
  K extends EventKind = EventKind,
> = (
  this: Relay,
  event: SubscriptionEvent<K>,
) => void;

export class PublicationEvent<
  K extends EventKind,
> extends MessageEvent<PublicationMessage<K>> {}

export interface PublicationEventData<K extends EventKind = EventKind> {
  id: EventId;
  event: NostrEvent<K>;
}

// ----------------------
// Extensions
// ----------------------

export interface RelayExtensionModule {
  default: RelayHandlers;
}

export interface RelayHandlers {
  handleMessageReceived: {
    [T in RelayToClientMessageType]?: RelayToClientMessageHandler<T>;
  };
  handleSubscriptionEvent: {
    [T in SubscriptionMessageType]?: SubscriptionMessageHandler;
  };
  handlePublicationEvent: {
    [T in PublicationMessageType]?: PublicationMessageHandler;
  };
}

/**
 * A handler for general messages from the relay
 */
export type RelayToClientMessageHandler<
  T extends RelayToClientMessageType = RelayToClientMessageType,
  K extends EventKind = EventKind,
> = (
  this: Relay,
  msg: RelayToClientMessage<T, K>,
) => void;

/**
 * A handler for responses to subscription requests
 */
export type SubscriptionMessage<K extends EventKind = EventKind> = {
  [T in RelayToClientMessageType]: RelayToClientMessageContent<K>[T][0] extends
    SubscriptionId ? RelayToClientMessage<T, K> : never;
}[RelayToClientMessageType];

export type SubscriptionMessageType = SubscriptionMessage[0];

export type SubscriptionMessageHandler<
  K extends EventKind = EventKind,
> = (
  this: Relay,
  msg: SubscriptionMessage<K>,
) => void;

/**
 * A handler for responses to publications
 */
export type PublicationMessageType = {
  [T in keyof RelayToClientMessageContent]:
    RelayToClientMessageContent[T][0] extends EventId ? T : never;
}[RelayToClientMessageType];

export type PublicationMessage<K extends EventKind> = RelayToClientMessage<
  PublicationMessageType,
  K
>;

export type PublicationMessageHandler<
  K extends EventKind = EventKind,
> = (
  this: Relay,
  msg: PublicationMessage<K>,
) => void;
