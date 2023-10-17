// deno-lint-ignore-file no-empty-interface

/**
 * Implementation of unextendable part of NIP-01 (Nostr basic protocol):
 * https://github.com/nostr-protocol/nips/blob/master/01.md
 *
 * See also `../../nips/01/protocol.d.ts` for the extendable part.
 *
 * @module
 */

import type { AlphabetLetter, Brand, Stringified } from "./types.ts";

// ----------------------
// Extendable interfaces
// ----------------------

export interface NipRecord {}

export interface EventKindRecord {}

export interface TagRecord {}

export interface ClientToRelayMessageRecord<
  K extends EventKind = EventKind,
> {}

export interface RelayToClientMessageRecord<
  K extends EventKind = EventKind,
> {}

// ----------------------
// Events and signatures
// ----------------------

export interface NostrEvent<K extends EventKind = EventKind> {
  id: EventId;
  pubkey: PublicKey;
  created_at: Timestamp;
  kind: K;
  tags: [...Tags<K>, ...OptionalTag<K>[]];
  content: Stringified<EventContent<K>>;
  sig: Signature;
}

export type EventId = Brand<string, "EventId">;
export type PublicKey = Brand<string, "PublicKey">;
export type Timestamp = Brand<number, "EventTimeStamp">;

export type PrivateKey = Brand<string, "PrivateKey">;
export type Signature = Brand<string, "EventSignature">;

export type EventSerializePrecursor<K extends EventKind = EventKind> = [
  header: 0,
  pubkey: NostrEvent<K>["pubkey"],
  created_at: NostrEvent<K>["created_at"],
  kind: NostrEvent<K>["kind"],
  tags: NostrEvent<K>["tags"],
  content: NostrEvent<K>["content"],
];

// ----------------------
// Tags
// ----------------------

export type TagType = keyof TagRecord & string;
export type TagParam = string | undefined;

export type Tag<T extends TagType = TagType> = {
  [K in T]: [K, TagValue<K>, ...TagParams<K>, ...TagParam[]];
}[T];

export type IndexedTagType = TagType & AlphabetLetter;
export type IndexedTag = Tag<IndexedTagType>;

export type TagValue<T extends TagType> = TagRecord[T][0];
export type TagParams<T extends TagType> = TagRecord[T] extends [
  TagValue<T>,
  ...infer P,
] ? P
  : never;

export type Tags<K extends EventKind> = EventKindRecord[K] extends
  { Tags: infer T extends Tag[] } ? T : [];

export type OptionalTag<K extends EventKind> = EventKindRecord[K] extends
  { OptionalTag: infer T extends Tag } ? T : never;

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
  [U in T]: [U, ...ClientToRelayMessageRecord<K>[U]];
}[T];
export type ClientToRelayMessageType = keyof ClientToRelayMessageRecord;

export type RelayToClientMessage<
  T extends RelayToClientMessageType = RelayToClientMessageType,
  K extends EventKind = EventKind,
> = {
  [U in T]: [U, ...RelayToClientMessageRecord<K>[U]];
}[T];
export type RelayToClientMessageType = keyof RelayToClientMessageRecord;

export type OkMessageContent<
  K extends EventKind = EventKind,
  B extends boolean = boolean,
> = [
  EventId,
  B,
  OkMessageBody<K, B>,
];

export type OkMessageBody<K extends EventKind, B extends boolean> = B extends
  true ? string : `${ResponsePrefix<K>}: ${string}`;

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
// Events
// ----------------------

export type EventKind = keyof EventKindRecord & number;

export interface EventKindRecordEntry {
  Content: unknown;
  OptionalTag?: Tag;
  Tags?: Tag[];
  ResponsePrefix?: string;
}

export type AnyEventContent = EventContent<EventKind>;

export type EventContent<K extends EventKind> = EventKindRecord[K] extends
  EventKindRecordEntry ? EventKindRecord[K]["Content"] : never;

export type ResponsePrefix<K extends EventKind = EventKind> =
  EventKindRecord[K] extends { ResponsePrefix: infer P extends string } ? P
    : DefaultResponsePrefix;

export type RegularEventKind = Brand<EventKind, "Regular">;
export type ReplaceableEventKind = Brand<EventKind, "Replaceable">;
export type EphemeralEventKind = Brand<EventKind, "Ephemeral">;
export type ParameterizedReplaceableEventKind = Brand<
  EventKind,
  "ParameterizedReplaceable"
>;

// ----------------------
// NIPs
// ----------------------

export type NIP = keyof NipRecord & number;

export interface NipRecordEntry {
  ClientToRelayMessage: ClientToRelayMessageType;
  RelayToClientMessage: RelayToClientMessageType;
  EventKind: EventKind;
  Tag: TagType;
}
