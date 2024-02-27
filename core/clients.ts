import type {
  ClientToRelayMessage,
  NostrEvent,
  RelayToClientMessage,
  SubscriptionId,
} from "./protocol.d.ts";
import {
  NostrNode,
  NostrNodeBase,
  NostrNodeConfig,
  NostrNodeModule,
} from "./nodes.ts";

// ----------------------
// Interfaces
// ----------------------

export type ClientConfig = NostrNodeConfig<
  RelayToClientMessage,
  ClientEventTypeRecord
>;
export type ClientOptions = Partial<ClientConfig>;

/**
 * A class that represents a remote Nostr client.
 */
export class Client extends NostrNodeBase<
  RelayToClientMessage,
  ClientEventTypeRecord
> implements NostrNode<RelayToClientMessage, ClientEventTypeRecord> {
  /**
   * The WebSocket connection to the client.
   */
  declare ws: WebSocket;

  /**
   * Writable interface for the subscriptions.
   */
  readonly subscriptions = new Map<
    SubscriptionId,
    WritableStream<NostrEvent>
  >();

  constructor(ws: WebSocket, opts?: ClientOptions) {
    super(ws, opts);
    this.ws.addEventListener("message", (ev: MessageEvent<string>) => {
      const message = JSON.parse(ev.data) as ClientToRelayMessage;
      // TODO: Validate the message.
      this.dispatch("message", message);
    });
  }
}

// ------------------------------
// Events
// ------------------------------

export interface ClientEventTypeRecord {
  "message": ClientToRelayMessage;
}

export type ClientEventType = keyof ClientEventTypeRecord;

// ------------------------------
// Modules
// ------------------------------

export type ClientModule = NostrNodeModule<
  RelayToClientMessage,
  ClientEventTypeRecord,
  Client
>;
