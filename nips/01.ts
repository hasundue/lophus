//
// NIP-01: Nostr Basic Protocol
// https://github.com/nostr-protocol/nips/blob/master/01.md
//
import { Brand } from "../lib/types.ts";

//
// Events
//
export interface UnsignedEvent {
  pubkey: PublicKey;
  created_at: EventTimestamp;
  kind: EventKind;
  tags: Tag[];
  content: string;
}

export type PublicKey = Brand<string, "PublicKey">;
export type EventTimestamp = Brand<number, "EventTimeStamp">;

export enum EventKind {
  Metadata = 0,
  TextNote = 1,
  RecommendRelay = 2,
}

export type Tag = EventTag | PubKeyTag;
export type EventTag = ["e", EventId, RecmRelayUrl];
export type PubKeyTag = ["p", PublicKey, RecmRelayUrl];

export type RecmRelayUrl = RelayUrl | "";

export interface SignedEvent extends UnsignedEvent {
  id: EventId;
  sig: EventSignature;
}

export type EventId = Brand<string, "EventId">;
export type PrivateKey = Brand<string, "PrivateKey">;
export type EventSignature = Brand<string, "EventSignature">;

export type EventSerializePrecursor = [
  0,
  PublicKey,
  EventTimestamp,
  EventKind,
  Tag[],
  string,
];

//
// Communication
//
export type RelayUrl = `wss://${string}`;

export type NostrMessage = ClientToRelayMessage | RelayToClientMessage;

export type ClientToRelayMessage =
  | PublishMessage
  | SubscribeMessage
  | CloseMessage;

export type PublishMessage = ["EVENT", SignedEvent];
export type SubscribeMessage = ["REQ", SubscriptionId, ...NostrFilter[]];
export type CloseMessage = ["CLOSE", SubscriptionId];

export type RelayToClientMessage =
  | EventMessage
  | EoseMessage
  | NoticeMessage;

export type EventMessage = ["EVENT", SubscriptionId, SignedEvent];
export type EoseMessage = ["EOSE", SubscriptionId];
export type NoticeMessage = ["NOTICE", string];

export type SubscriptionId = Brand<string, "SubscriptionId">;

export interface NostrFilter {
  ids?: EventId[];
  authors?: PublicKey[];
  kinds?: EventKind[];
  "#e"?: EventId[];
  "#p"?: PublicKey[];
  since?: EventTimestamp;
  until?: EventTimestamp;
  limit?: number;
}
