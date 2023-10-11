//
// NIP-01: Nostr Basic Protocol
// https://github.com/nostr-protocol/nips/blob/master/01.md
//
import type { AlphabetLetter, Brand, Stringified, Url } from "../core/types.ts";

export enum NIP {
  BasicProtocol = 1,
}

// ----------------------
// Events and signatures
// ----------------------

export interface NostrEvent<K extends EventKind = EventKind> {
  id: EventId;
  pubkey: PublicKey;
  created_at: Timestamp;
  kind: K;
  tags: TagFor<K>[];
  content: Stringified<EventContentFor<K>>;
  sig: Signature;
}

export type EventId = Brand<string, "EventId">;
export type PublicKey = Brand<string, "PublicKey">;
export type Timestamp = Brand<number, "EventTimeStamp">;

export type PrivateKey = Brand<string, "PrivateKey">;
export type Signature = Brand<string, "EventSignature">;

export type EventSerializePrecursor<K extends EventKind = EventKind> = [
  header: 0,
  pubkey: PublicKey,
  created_at: Timestamp,
  kind: K,
  tags: TagFor<K>[],
  content: Stringified<EventContentFor<K>>,
];

// ----------------------
// Tags
// ----------------------

export type Tag<T extends TagType = TagType> = {
  [K in T]: [K, TagValue<K>, ...TagParams<K>, ...TagParam[]];
}[T];

export type IndexedTagType = TagType & AlphabetLetter;
export type IndexedTag = Tag<IndexedTagType>;
export type TagParam = string | undefined;

export interface TagContent {
  /** Event ID */
  "e": [EventId, RelayUrl?];
  /** Public key */
  "p": [PublicKey, RelayUrl?];
  /** (Maybe parameterized) replaceable event */
  "a":
    | [`${EventKind}:${PublicKey}:${TagValue<"d">}`, RelayUrl?]
    | [`${EventKind}:${PublicKey}`, RelayUrl?];
  /** Identifier */
  "d": [string];
}

export type TagType = keyof TagContent;
export type TagValue<T extends TagType> = TagContent[T][0];
export type TagParams<T extends TagType> = TagContent[T] extends [
  TagValue<T>,
  ...infer P,
] ? P
  : never;

// ----------------------
// Communication
// ----------------------

export type RelayUrl = `wss://${string}` | `ws://${string}`;
export type SubscriptionId = Brand<string, "SubscriptionId">;

export type NostrMessage = ClientToRelayMessage | RelayToClientMessage;

export type ClientToRelayMessage<
  T extends ClientToRelayMessageType = ClientToRelayMessageType,
  K extends EventKind = EventKind,
> = {
  [U in T]: [U, ...ClientToRelayMessageContent<K>[U]];
}[T];

export enum SubscriptionMessageTypeEnum {
  EVENT = "EVENT",
  REQ = "REQ",
  CLOSE = "CLOSE",
}

export interface ClientToRelayMessageContent<K extends EventKind = EventKind> {
  EVENT: [NostrEvent<K>];
  REQ: [SubscriptionId, ...SubscriptionFilter<K>[]];
  CLOSE: [SubscriptionId];
}
export type ClientToRelayMessageType = keyof ClientToRelayMessageContent;

export type RelayToClientMessage<
  T extends RelayToClientMessageType = RelayToClientMessageType,
  K extends EventKind = EventKind,
> = {
  [U in T]: [U, ...RelayToClientMessageContent<K>[U]];
}[T];

export interface RelayToClientMessageContent<K extends EventKind = EventKind> {
  EVENT: [SubscriptionId, NostrEvent<K>];
  OK: OkMessageContent;
  EOSE: [SubscriptionId];
  NOTICE: [string];
}
export type RelayToClientMessageType = keyof RelayToClientMessageContent;

export type OkMessageContent<
  K extends EventKind = EventKind,
  B extends boolean = boolean,
> = [
  EventId,
  B,
  OkMessageBody<K, B>,
];

export type OkMessageBody<K extends EventKind, B extends boolean> = B extends
  true ? string : `${ResponsePrefixFor<K>}: ${string}`;

export type DefaultResponsePrefix =
  | "duplicate"
  | "pow"
  | "blocked"
  | "rate-limited"
  | "invalid"
  | "error";

export type SubscriptionFilter<
  K extends EventKind = EventKind,
  T extends IndexedTagType = IndexedTagType,
> =
  & {
    ids?: EventId[];
    authors?: PublicKey[];
    kinds?: K[];
  }
  & {
    [U in T as `#${U}`]?: TagValue<U>[];
  }
  & {
    since?: Timestamp;
    until?: Timestamp;
    limit?: number;
  };

// ----------------------
// Event kinds
// ----------------------

export enum EventKind {
  Metadata = 0,
  TextNote = 1,
}

export interface EventKindRecord extends Record<EventKind, EventKindSpecEntry> {
  0: {
    Tag: Tag;
    Content: MetadataContent;
  };
  1: {
    Tag: Tag;
    Content: string;
  };
}

export interface EventKindSpecEntry {
  Tag: Tag;
  Content: unknown;
  ResponsePrefix?: string;
}

export type TagFor<K extends EventKind> = EventKindRecord[K]["Tag"];

export type EventContentFor<K extends EventKind> =
  EventKindRecord[K]["Content"];

export type ResponsePrefixFor<K extends EventKind = EventKind> =
  EventKindRecord[K] extends { ResponsePrefix: infer P extends string } ? P
    : DefaultResponsePrefix;

export type MetadataEvent = NostrEvent<0>;
export type TextNoteEvent = NostrEvent<1>;

//
// TODO: Use template literal for narrowing EventKind
//
export type RegularEventKind = Brand<EventKind, "Regular">;
export type ReplaceableEventKind = Brand<EventKind, "Replaceable">;
export type EphemeralEventKind = Brand<EventKind, "Ephemeral">;
export type ParameterizedReplaceableEventKind = Brand<
  EventKind,
  "ParameterizedReplaceable"
>;

export interface MetadataContent {
  name: string;
  about: string;
  picture: Url;
}
