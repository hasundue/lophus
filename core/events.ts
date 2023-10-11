import type {
  EventId,
  EventKind,
  NostrEvent,
  RelayToClientMessage,
  RelayToClientMessageContent,
  RelayToClientMessageType,
  SubscriptionId,
} from "../nips/01.ts";

export class EventReceived<
  K extends EventKind = EventKind,
> extends MessageEvent<NostrEvent<K>> {
  declare data: NostrEvent<K>;
}


export type PublicationMessageType = {
  [T in keyof RelayToClientMessageContent]:
    RelayToClientMessageContent[T][0] extends EventId ? T : never;
}[RelayToClientMessageType];

export type ResponseMessage<K extends EventKind> = RelayToClientMessage<
  PublicationMessageType,
  K
>;

export type SubscriptionMessage<K extends EventKind = EventKind> = {
  [T in RelayToClientMessageType]: RelayToClientMessageContent<K>[T][0] extends
    SubscriptionId ? RelayToClientMessage<T, K> : never;
}[RelayToClientMessageType];

export type SubscriptionMessageType = SubscriptionMessage[0];
