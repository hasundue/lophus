import type {
  ClientToRelayMessage,
  NostrEvent,
  RelayToClientMessage,
  SubscriptionId,
} from "./protocol.ts";
import { Node, NodeConfig } from "./nodes.ts";

export type ClientConfig = NodeConfig;
export type ClientOptions = Partial<ClientConfig>;

export interface ClientEventTypeRecord {
  receive: ClientToRelayMessage;
}

/**
 * A class that represents a remote Nostr client.
 */
export class Client extends Node<
  RelayToClientMessage,
  ClientEventTypeRecord
> {
  declare ws: WebSocket;
  declare config: ClientConfig;

  /** Writable interface for the subscriptions. */
  readonly subscriptions: Map<
    SubscriptionId,
    WritableStream<NostrEvent>
  > = new Map();

  constructor(ws: WebSocket, options?: ClientOptions) {
    super(ws, options);
    this.config = {
      ...this.config,
      ...options,
    };
    this.ws.addEventListener("message", (ev: MessageEvent<string>) => {
      const message = JSON.parse(ev.data) as ClientToRelayMessage;
      // TODO: Validate the message.
      this.dispatch("receive", message);
    });
  }
}
