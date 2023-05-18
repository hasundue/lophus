import { Brand } from "./utils.ts";
import { Event as NostrEvent, Filter } from "npm:nostr-tools@1.10.1";

//
// Events
//
export type EventId = Brand<string, "EventId">;
export type SubscriptionId = Brand<string, "SubscriptionId">;

//
// Communication
//
export type WebSocketUrl = `wss://${string}`;
export type RelayUrl = Brand<WebSocketUrl, "RelayUrl">;

export type RelayToClientMessage =
  | ["EVENT", SubscriptionId, NostrEvent]
  | ["EOSE", SubscriptionId, ...Filter[]]
  | ["NOTICE", string];

export type ClientToRelayMessage =
  | ["EVENT", NostrEvent]
  | ["REQ", SubscriptionId, ...Filter[]]
  | ["CLOSE", SubscriptionId];

//
// WebSocket
//
export type WebSocketEventType = Omit<WebSocketEventMap, "message">;

export type WebSocketEventListner = {
  [K in keyof WebSocketEventType]: (event: WebSocketEventMap[K]) => void;
};
