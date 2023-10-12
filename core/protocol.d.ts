// deno-lint-ignore-file no-empty-enum no-empty-interface

/**
 * Implementation of unextendable part of NIP-01 (Nostr basic protocol):
 * https://github.com/nostr-protocol/nips/blob/master/01.md
 *
 * @module
 */

import type { AlphabetLetter, Brand, Stringified } from "./types.ts";

// ----------------------
// Extendable interfaces
// ----------------------

declare enum NIP {}
declare enum EventKind {}

declare interface EventKindRecord
  extends Record<EventKind, EventKindRecordEntry> {}

declare interface TagRecord {}

declare interface ClientToRelayMessageRecord<
  K extends EventKind = EventKind,
> {}

declare interface RelayToClientMessageRecord<
  K extends EventKind = EventKind,
> {}

// ----------------------
// Events and signatures
// ----------------------

declare interface NostrEvent<K extends EventKind = EventKind> {
  id: EventId;
  pubkey: PublicKey;
  created_at: Timestamp;
  kind: K;
  tags: TagFor<K>[];
  content: Stringified<EventContentFor<K>>;
  sig: Signature;
}

declare type EventId = Brand<string, "EventId">;
declare type PublicKey = Brand<string, "PublicKey">;
declare type Timestamp = Brand<number, "EventTimeStamp">;

declare type PrivateKey = Brand<string, "PrivateKey">;
declare type Signature = Brand<string, "EventSignature">;

declare type EventSerializePrecursor<K extends EventKind = EventKind> = [
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

declare type TagType = keyof TagRecord;
declare type TagParam = string | undefined;

declare type Tag<T extends TagType = TagType> = {
  [K in T]: [K, TagValue<K>, ...TagParams<K>, ...TagParam[]];
}[T];

declare type IndexedTagType = TagType & AlphabetLetter;
declare type IndexedTag = Tag<IndexedTagType>;

declare type TagValue<T extends TagType> = TagRecord[T][0];
declare type TagParams<T extends TagType> = TagRecord[T] extends [
  TagValue<T>,
  ...infer P,
] ? P
  : never;
declare type TagFor<K extends EventKind> = EventKindRecord[K]["Tag"];

// ----------------------
// Communication
// ----------------------

declare type RelayUrl = `wss://${string}` | `ws://${string}`;
declare type SubscriptionId = Brand<string, "SubscriptionId">;

declare type NostrMessage = ClientToRelayMessage | RelayToClientMessage;

declare type ClientToRelayMessage<
  T extends ClientToRelayMessageType = ClientToRelayMessageType,
  K extends EventKind = EventKind,
> = {
  [U in T]: [U, ...ClientToRelayMessageRecord<K>[U]];
}[T];
declare type ClientToRelayMessageType = keyof ClientToRelayMessageRecord;

declare type RelayToClientMessage<
  T extends RelayToClientMessageType = RelayToClientMessageType,
  K extends EventKind = EventKind,
> = {
  [U in T]: [U, ...RelayToClientMessageRecord<K>[U]];
}[T];
declare type RelayToClientMessageType = keyof RelayToClientMessageRecord;

declare type OkMessageContent<
  K extends EventKind = EventKind,
  B extends boolean = boolean,
> = [
  EventId,
  B,
  OkMessageBody<K, B>,
];

declare type OkMessageBody<K extends EventKind, B extends boolean> = B extends
  true ? string : `${ResponsePrefixFor<K>}: ${string}`;

declare type DefaultResponsePrefix =
  | "duplicate"
  | "pow"
  | "blocked"
  | "rate-limited"
  | "invalid"
  | "error";

declare type SubscriptionFilter<
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
// Events
// ----------------------

declare interface EventKindRecordEntry {
  Tag: Tag;
  Content: unknown;
  ResponsePrefix?: string;
}

declare type EventContentFor<K extends EventKind> =
  EventKindRecord[K]["Content"];

declare type ResponsePrefixFor<K extends EventKind = EventKind> =
  EventKindRecord[K] extends { ResponsePrefix: infer P extends string } ? P
    : DefaultResponsePrefix;

declare type RegularEventKind = Brand<EventKind, "Regular">;
declare type ReplaceableEventKind = Brand<EventKind, "Replaceable">;
declare type EphemeralEventKind = Brand<EventKind, "Ephemeral">;
declare type ParameterizedReplaceableEventKind = Brand<
  EventKind,
  "ParameterizedReplaceable"
>;
