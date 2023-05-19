import type { Event as NostrEvent, Filter } from "npm:nostr-tools@1.10.1";

//
// Utility types
//
export type Brand<K, T> = K & { __brand: T };

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
export type Require<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type Replace<T, K extends keyof T, V> = Omit<T, K> & { [P in K]: V };

//
// Events
//
export type EventId = Brand<string, "EventId">;
export type SubscriptionId = Brand<string, "SubscriptionId">;

//
// Communication
//
export type WebSocketUrl = `wss://${string}`;

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
