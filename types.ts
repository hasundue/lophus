//
// NIP-01: Nostr Basic Protocol
// https://github.com/nostr-protocol/nips/blob/master/01.md
//
import { Brand } from "./lib/types.ts";

//
// Events
//
export type UnsignedEvent = {
  id: EventId;
  pubkey: PubKey;
  created_at: EventTimeStamp;
  kind: EventKind;
  tags: Tag[];
  content: string;
};

export type SignedEvent = UnsignedEvent & {
  sig: EventSignature;
};

export type EventId = Brand<string, "EventId">;
export type PubKey = Brand<string, "PubKey">;
export type EventTimeStamp = Brand<number, "EventTimeStamp">;

export enum EventKind {
  Metadata = 0,
  TextNote = 1,
  RecommendRelay = 2,
}

export type Tag = EventTag | PubKeyTag;
export type EventTag = ["e", EventId, RelayUrl];
export type PubKeyTag = ["p", PubKey, RelayUrl];

export type EventSignature = Brand<string, "EventSignature">;

//
// Communication
//
export type RelayUrl = `wss://${string}`;

export type ClientToRelayMessage =
  | PublishMessage
  | SubscribeMessage
  | CloseMessage;

export type PublishMessage = ["EVENT", SignedEvent];
export type SubscribeMessage = ["REQ", SubscriptionId, ...Filter[]];
export type CloseMessage = ["CLOSE", SubscriptionId];

export type RelayToClientMessage =
  | EventMessage
  | EoseMessage
  | NoticeMessage;

export type EventMessage = ["EVENT", SubscriptionId, UnsignedEvent];
export type EoseMessage = ["EOSE", SubscriptionId, ...Filter[]];
export type NoticeMessage = ["NOTICE", string];

export type SubscriptionId = Brand<string, "SubscriptionId">;

export const SubscriptionId = {
  random: () => Math.random().toString().slice(2) as SubscriptionId,
};

export type Filter = Partial<{
  ids: EventId[];
  authors: PubKey[];
  kinds: EventKind[];
  "#e": EventTag[];
  "#p": PubKeyTag[];
  since: EventTimeStamp;
  until: EventTimeStamp;
  limit: number;
}>;
