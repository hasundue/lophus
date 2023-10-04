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

export type AnyTag = Tag<string>;
export type IndexedTag = Tag<AlphabetLetter>;

export type Tag<T extends string> = [T, ...TagValueFor[T]];

export interface TagValueFor extends Record<string, TagValue> {
  // Event
  "e": [EventId, RelayUrl?];
  // Public key
  "p": [PublicKey, RelayUrl?];
  // (Maybe parameterized) replaceable event
  "a": [
    `${EventKind}:${PublicKey}:${TagValueFor["d"][0]}`,
    RelayUrl?,
  ] | [
    `${EventKind}:${PublicKey}`,
    RelayUrl?,
  ];
  // Identifier
  "d": [string];
}

// TODO: Tighten the type of TagValue
export type TagValue = (string | undefined)[];

export interface TagFor extends Record<number, AnyTag> {
  0: AnyTag;
  1: AnyTag;
}

// ----------------------
// Communication
// ----------------------

export type RelayUrl = `wss://${string}` | `ws://${string}`;

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
  T extends AlphabetLetter = AlphabetLetter,
> =
  & {
    ids?: EventId[];
    authors?: PublicKey[];
    kinds?: K[];
  }
  // TODO: Restrict to 1 tag per filter
  & {
    [key in `#${T}`]?: TagValueFor[T][];
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
