//
// NIP-01: Nostr Basic Protocol
// https://github.com/nostr-protocol/nips/blob/master/01.md
//
import { Brand } from "../types.ts";

// ----------------------
// Events and signatures
// ----------------------

export interface NostrEvent<K extends EventKind = EventKind> {
  id: EventId;
  pubkey: PublicKey;
  created_at: Timestamp;
  kind: K;
  tags: Tag[];
  content: Stringified<EventContent[K]>;
  sig: Signature;
}

export type EventId = Brand<string, "EventId">;
export type PublicKey = Brand<string, "PublicKey">;
export type Timestamp = Brand<number, "EventTimeStamp">;

// ----------------------
// Tags
// ----------------------

export type Tag<T extends TagName = TagName> = [T, ...string[]];

export type TagName = Brand<string, "TagName">;
export type IndexedEventTag = [IndexedEventTagName, ...string[]];

export type EventTag = ["e", EventId, RecmRelayUrl?];
export type PubKeyTag = ["p", PublicKey, RecmRelayUrl?];
export type ParameterizedReplaceableEventTag = [
  "a",
  `${EventKind}:${PublicKey}:${TagValue<"d">}`,
  RecmRelayUrl?,
];
export type NonParameterizedReplaceableEventTag = [
  "a",
  `${EventKind}:${PublicKey}`,
  RecmRelayUrl?,
];

// TODO: Use template literal
export type IndexedEventTagName = Brand<string, "IndexedEventTagName">;
// TODO: Use template literal
export type TagValue<T extends string = string> = Brand<string, `${T}TagValue`>;

export type RecmRelayUrl = RelayUrl;

export type PrivateKey = Brand<string, "PrivateKey">;
export type Signature = Brand<string, "EventSignature">;

export type EventSerializePrecursor<K extends EventKind = EventKind> = [
  header: 0,
  pubkey: PublicKey,
  created_at: Timestamp,
  kind: K,
  tags: Tag[],
  content: Stringified<EventContent[K]>,
];

// ----------------------
// Communication
// ----------------------

export type RelayUrl = `wss://${string}`;

export type NostrMessage = ClientToRelayMessage | RelayToClientMessage;

export type ClientToRelayMessage =
  | PublishMessage
  | SubscribeMessage
  | CloseMessage;

export type PublishMessage<K extends EventKind = EventKind> = [
  "EVENT",
  NostrEvent<K>,
];
export type SubscribeMessage = ["REQ", SubscriptionId, ...SubscriptionFilter[]];
export type CloseMessage = ["CLOSE", SubscriptionId];

export type RelayToClientMessage =
  | EventMessage
  | OkMessage
  | EoseMessage
  | NoticeMessage;

export type EventMessage<K extends EventKind = EventKind> = [
  "EVENT",
  SubscriptionId,
  NostrEvent<K>,
];
export type OkMessage<B extends boolean = boolean> = [
  "OK",
  EventId,
  B,
  OkMessageBody<B>,
];
export type EoseMessage = ["EOSE", SubscriptionId];
export type NoticeMessage = ["NOTICE", string];

export type SubscriptionId = Brand<string, "SubscriptionId">;
export type OkMessageBody<B extends boolean> = B extends true
  ? "" | OkMessageBodyString
  : OkMessageBodyString;
export type OkMessageBodyString = `${OkMessageBodyPrefix}: ${string}`;
export type OkMessageBodyPrefix =
  | "duplicate"
  | "pow"
  | "blocked"
  | "rate-limited"
  | "invalid"
  | "error";

export type SubscriptionFilter<
  K extends EventKind = EventKind,
  T extends IndexedEventTagName = IndexedEventTagName,
> =
  & {
    ids?: EventId[];
    authors?: PublicKey[];
    kinds?: K[];
  }
  // TODO: Restrict to 1 tag per filter
  & {
    [key in `#${T}`]?: TagValue<T>[];
  }
  & {
    since?: Timestamp;
    until?: Timestamp;
    limit?: number;
  };

// ----------------------
// Basic event kinds
// ----------------------

export type EventKind<T extends number = number> = Brand<T, "EventKind">;

export type MetadataEvent = NostrEvent<EventKind<0>>;
export type TextNoteEvent = NostrEvent<EventKind<1>>;

// TODO: Use template literal for T

export type RegularEventKind<T extends number = number> = Brand<
  T,
  "EventKind",
  "Regular"
>;
export type ReplaceableEventKind<T extends number = number> = Brand<
  T,
  "EventKind",
  "Replaceable"
>;
export type EphemeralEventKind<T extends number = number> = Brand<
  T,
  "EventKind",
  "Ephemeral"
>;
export type ParameterizedReplaceableEventKind<T extends number = number> =
  Brand<
    T,
    "EventKind",
    "ParameterizedReplaceable"
  >;

export const EventKind = {
  0: 0 as EventKind<0>,
  Metadata: 0 as EventKind<0>,

  1: 1 as EventKind<1>,
  TextNote: 1 as EventKind<1>,

  $<T extends number>(kind: T): EventKind<T> {
    return kind as EventKind<T>;
  },

  isRegularEventKind(
    kind: EventKind,
  ): kind is RegularEventKind {
    return 1000 <= kind && kind < 10000;
  },
  isReplaceableEventKind(
    kind: EventKind,
  ): kind is ReplaceableEventKind {
    return (10000 <= kind && kind < 20000) || kind === 0 || kind === 3;
  },
  isEphemeralEventKind(
    kind: EventKind,
  ): kind is EphemeralEventKind {
    return 20000 <= kind && kind < 30000;
  },
  isParameterizedReplaceableEventKind(
    kind: EventKind,
  ): kind is ParameterizedReplaceableEventKind {
    return 30000 <= kind && kind < 40000;
  },
};

export type EventContent = [
  MetadataContent,
  string,
  RelayUrl,
];

export interface MetadataContent {
  name: string;
  about: string;
  picture: Url;
}

export type Url = Brand<string, "Url"> | "";

// ----------------------
// Utility types
// ----------------------

export type Stringified<T> = string & { __content: T };
