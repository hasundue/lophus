import { Brand } from "./utils.ts";

export type EventId = Brand<string, "EventId">;

export type NostrProfile = Brand<string, "NostrProfile">;
export type NostrEvent = Brand<string, "NostrEvent">;
export type NostrPubkey = Brand<string, "NostrPubkey">;

export type RelayUrl = `wss://${string}`;

export type WebSocketEventType = Omit<WebSocketEventMap, "message">;

export type WebSocketEventListner = {
  [K in keyof WebSocketEventType]: (event: WebSocketEventMap[K]) => void;
};
