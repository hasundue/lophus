import type {
  ClientToRelayMessage,
  NostrEvent,
  RelayToClientMessage,
  SubscriptionId,
} from "./protocol.d.ts";
import {
  NostrNode,
  NostrNodeConfig,
  NostrNodeEvent,
  NostrNodeModule,
} from "./nodes.ts";
import { importNips } from "./nips.ts";

// ----------------------
// NIPs
// ----------------------

const NIPs = await importNips<
  RelayToClientMessage,
  ClientEventTypeRecord,
  Client
>(import.meta.url, "../nips");

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
export class Client extends NostrNode<
  RelayToClientMessage,
  ClientEventTypeRecord
> {
  declare ws: WebSocket;

  /**
   * Writable interface for the subscriptions.
   */
  readonly subscriptions = new Map<
    SubscriptionId,
    WritableStream<NostrEvent>
  >();

  constructor(ws: WebSocket, opts?: ClientOptions) {
    super(ws, {
      ...opts,
      modules: NIPs.concat(opts?.modules ?? []),
    });
    this.ws.addEventListener("message", (ev: MessageEvent<string>) => {
      const message = JSON.parse(ev.data) as ClientToRelayMessage;
      // TODO: Validate the message.
      this.dispatchEvent(new ClientEvent("recieved", message));
    });
  }
}

// ------------------------------
// Events
// ------------------------------

export interface ClientEventTypeRecord {
  "recieved": ClientToRelayMessage;
}

export type ClientEventType = keyof ClientEventTypeRecord;

export class ClientEvent<
  T extends ClientEventType = ClientEventType,
> extends NostrNodeEvent<ClientEventTypeRecord, T> {}

// ------------------------------
// Modules
// ------------------------------

export type ClientModule = NostrNodeModule<
  RelayToClientMessage,
  ClientEventTypeRecord,
  Client
>;
