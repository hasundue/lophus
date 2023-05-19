//
// NIP-01: Nostr Basic Protocol
// https://github.com/nostr-protocol/nips/blob/master/01.md
//
import { Brand } from "./lib/types.ts";

//
// Events
//
export type UnsignedEvent = {
  pubkey: PubKey;
  created_at: EventTimeStamp;
  kind: EventKind;
  tags: Tag[];
  content: string;
};

export type SerializedEvent = Brand<Uint8Array, "SerializedEvent">;

export function serializeEvent(event: UnsignedEvent): SerializedEvent {
  const { pubkey, created_at, kind, tags, content } = event;
  const input = [
    0,
    pubkey,
    created_at,
    kind,
    tags,
    content,
  ];
  const json = JSON.stringify(input);
  const encoder = new TextEncoder();
  return encoder.encode(json) as SerializedEvent;
}

export type EventId = Brand<string, "EventId">;

export type PrivateKey = Brand<CryptoKey, "PrivateKey">;

export async function signEvent(
  event: UnsignedEvent,
  nsec: PrivateKey,
): Promise<SignedEvent> {
  const decoder = new TextDecoder();
  const serialized = serializeEvent(event);
  const hash = await crypto.subtle.digest("SHA-256", serialized);
  const sig = await crypto.subtle.sign("SHA-256", nsec, hash);
  return {
    ...event,
    id: decoder.decode(hash) as EventId,
    sig: decoder.decode(sig) as EventSignature,
  };
}

export type SignedEvent = UnsignedEvent & {
  id: EventId;
  sig: EventSignature;
};

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

export type EventMessage = ["EVENT", SubscriptionId, SignedEvent];
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
