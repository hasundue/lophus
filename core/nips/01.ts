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

export type Tag = EventTag | PubKeyTag;
export type EventTag = ["e", EventId, RecmRelayUrl];
export type PubKeyTag = ["p", PublicKey, RecmRelayUrl];

export type RecmRelayUrl = RelayUrl | "";

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
  | EoseMessage
  | NoticeMessage;

export type EventMessage<K extends EventKind = EventKind> = [
  "EVENT",
  SubscriptionId,
  NostrEvent<K>,
];
export type EoseMessage = ["EOSE", SubscriptionId];
export type NoticeMessage = ["NOTICE", NoticeBody];

export type SubscriptionId = Brand<string, "SubscriptionId">;
export type NoticeBody = string;

export interface SubscriptionFilter<K extends EventKind = EventKind> {
  ids?: EventId[];
  authors?: PublicKey[];
  kinds?: K[];
  "#e"?: EventId[];
  "#p"?: PublicKey[];
  since?: Timestamp;
  until?: Timestamp;
  limit?: number;
}

// ----------------------
// Basic event kinds
// ----------------------

export enum EventKind {
  Metadata = 0,
  TextNote = 1,
  RecommendRelay = 2,
}

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
