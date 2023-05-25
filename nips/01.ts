//
// NIP-01: Nostr Basic Protocol
// https://github.com/nostr-protocol/nips/blob/master/01.md
//
import { Brand } from "../core/types.ts";

// ----------------------
// Events and signatures
// ----------------------

export type NostrEvent<K extends EventKind = EventKind> =
  | UnsignedEvent<K>
  | SignedEvent<K>;

export interface UnsignedEvent<K extends EventKind = EventKind> {
  pubkey: PublicKey;
  created_at: EventTimestamp;
  kind: K;
  tags: Tag[];
  content: EventContent<K>;
}

export type PublicKey = Brand<string, "PublicKey">;
export type EventTimestamp = Brand<number, "EventTimeStamp">;

export type Tag = EventTag | PubKeyTag;
export type EventTag = ["e", EventId, RecmRelayUrl];
export type PubKeyTag = ["p", PublicKey, RecmRelayUrl];

export type RecmRelayUrl = RelayUrl | "";

export interface SignedEvent<K extends EventKind = EventKind>
  extends UnsignedEvent<K> {
  id: EventId;
  sig: EventSignature;
}

export type EventId = Brand<string, "EventId">;
export type PrivateKey = Brand<string, "PrivateKey">;
export type EventSignature = Brand<string, "EventSignature">;

export type EventSerializePrecursor<K extends EventKind = EventKind> = [
  0,
  PublicKey,
  EventTimestamp,
  K,
  Tag[],
  EventContent<K>,
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
  SignedEvent<K>,
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
  SignedEvent<K>,
];
export type EoseMessage = ["EOSE", SubscriptionId];
export type NoticeMessage = ["NOTICE", string];

export type SubscriptionId = Brand<string, "SubscriptionId">;

export interface SubscriptionFilter {
  ids?: EventId[];
  authors?: PublicKey[];
  kinds?: EventKind[];
  "#e"?: EventId[];
  "#p"?: PublicKey[];
  since?: EventTimestamp;
  until?: EventTimestamp;
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

// deno-fmt-ignore
export type EventContent<K extends EventKind> = 
  K extends EventKind.Metadata
    ? MetadataContent
  : K extends EventKind.TextNote 
    ? string
  : K extends EventKind.RecommendRelay 
    ? RelayUrl
  : never;

export interface MetadataContent {
  name: string;
  about: string;
  picture: Url;
}

export type Url = Brand<string, "Url"> | "";
