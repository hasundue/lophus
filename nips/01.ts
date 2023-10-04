//
// NIP-01: Nostr Basic Protocol
// https://github.com/nostr-protocol/nips/blob/master/01.md
//
import type { AlphabetLetter, Brand } from "../core/types.ts";

// ----------------------
// Events and signatures
// ----------------------

export interface NostrEvent<K extends EventKind = EventKind> {
  id: EventId;
  pubkey: PublicKey;
  created_at: Timestamp;
  kind: K;
  tags: TagFor[K][];
  content: Stringified<EventContentFor[K]>;
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
  tags: TagFor[K][],
  content: Stringified<EventContentFor[K]>,
];

// ----------------------
// Tags
// ----------------------

export type Tag<T extends TagType = TagType> = {
  [K in T]: [K, TagValue[K], ...TagParams[K], ...(string | undefined)[]];
}[T];

export type IndexedTagType = TagType & AlphabetLetter;
export type IndexedTag = Tag<IndexedTagType>;

export interface TagValue {
  /** Event tag */
  "e": EventId;
  // Public key
  "p": PublicKey;
  // (Maybe parameterized) replaceable event
  "a":
    | `${EventKind}:${PublicKey}:${TagValue["d"]}`
    | `${EventKind}:${PublicKey}`;
  // Identifier
  "d": string;
}

export type TagType = keyof TagValue;

export interface TagParams extends Record<TagType, (string | undefined)[]> {
  /** Event */
  "e": [RelayUrl?];
  /** Public key */
  "p": [RelayUrl?];
  /** (Maybe parameterized) replaceable event */
  "a": [RelayUrl?];
  /** Identifier */
  "d": [];
}

export interface TagFor extends Record<EventKind, Tag> {
  0: Tag;
  1: Tag;
}

// ----------------------
// Communication
// ----------------------

export type RelayUrl = `wss://${string}` | `ws://${string}`;

export type SubscriptionId = Brand<string, "SubscriptionId">;

export type NostrMessage = ClientToRelayMessage | RelayToClientMessage;

export type ClientToRelayMessage<
  T extends ClientToRelayMessageType = ClientToRelayMessageType,
> = [T, ...ClientToRelayMessageContentFor[T]];

export enum ClientToRelayMessageType {
  EVENT = "EVENT",
  REQ = "REQ",
  CLOSE = "CLOSE",
}

export interface ClientToRelayMessageContentFor {
  EVENT: [NostrEvent];
  REQ: [SubscriptionId, ...SubscriptionFilter[]];
  CLOSE: [SubscriptionId];
}

export type RelayToClientMessage<
  T extends RelayToClientMessageType = RelayToClientMessageType,
> = [T, ...RelayToClientMessageContentFor[T]];

export interface RelayToClientMessageContentFor {
  "EVENT": [SubscriptionId, NostrEvent];
  "OK": OkMessage;
  "EOSE": [SubscriptionId];
  "NOTICE": [string];
}
export type RelayToClientMessageType = keyof RelayToClientMessageContentFor;

export type OkMessage<B extends boolean = boolean> = [
  "OK",
  EventId,
  B,
  OkMessageBody<B>,
];

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
  Ks extends EventKind = EventKind,
  Ts extends IndexedTagType = IndexedTagType,
> =
  & {
    ids?: EventId[];
    authors?: PublicKey[];
    kinds?: Ks[];
  }
  & {
    [T in Ts as `#${T}`]?: TagValue[T][];
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

export interface EventContentFor extends Record<EventKind, unknown> {
  0: MetadataContent;
  1: string;
}

export interface MetadataContent {
  name: string;
  about: string;
  picture: Url;
}

export type Url = `https://${string}` | `http://${string}`;

// ----------------------
// Utility types
// ----------------------

export type Stringified<T> = string & { __content: T };
