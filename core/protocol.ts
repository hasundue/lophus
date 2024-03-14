// deno-lint-ignore-file no-empty-interface

/**
 * Implementation of the fundamental part of NIP-01 (Nostr basic protocol):
 * https://github.com/nostr-protocol/nips/blob/master/01.md
 *
 * See also `../../nips/01/protocol.ts` for the remaining "optional" part.
 * @module
 */

import type { AlphabetLetter, Brand, Stringified } from "@lophus/lib/types";

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

/** An event that has not been signed. */
export type UnsignedEvent<K extends EventKind = EventKind> = Omit<
  NostrEvent<K>,
  "id" | "pubkey" | "sig"
>;

/** A precursor to NostrEvent required for users to fill */
export interface EventInit<K extends EventKind = EventKind> {
  kind: NostrEvent<K>["kind"];
  tags?: NostrEvent<K>["tags"];
  content: EventContent<K> | Stringified<EventContent<K>>;
}

// ----------------------
// Tags
// ----------------------

export interface TagRecord {}

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

export interface ClientToRelayMessageRecord<
  K extends EventKind = EventKind,
> {}

export type ClientToRelayMessage<
  T extends ClientToRelayMessageType = ClientToRelayMessageType,
  K extends EventKind = EventKind,
> = {
  [U in T]: [U, ...ClientToRelayMessageRecord<K>[U]];
}[T];
export type ClientToRelayMessageType = keyof ClientToRelayMessageRecord;

export interface RelayToClientMessageRecord<
  K extends EventKind = EventKind,
> {}

export type RelayToClientMessage<
  T extends RelayToClientMessageType = RelayToClientMessageType,
  K extends EventKind = EventKind,
> = {
  [U in T]: [U, ...RelayToClientMessageRecord<K>[U]];
}[T];
export type RelayToClientMessageType = keyof RelayToClientMessageRecord;

export type RelayToClientErrorMessage<K extends EventKind, B extends boolean> =
  B extends true ? string : `${ResponsePrefix<K>}: ${string}`;

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

export type InterNodeMessage = ClientToRelayMessage | RelayToClientMessage;

// ----------------------
// Events
// ----------------------

export interface EventKindRecord {}

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
