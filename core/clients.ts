import type {
  ClientToRelayMessage,
  ClientToRelayMessageType,
  NostrEvent,
  RelayToClientMessage,
  SubscriptionFilter,
  SubscriptionId,
} from "./protocol.d.ts";
import {
  NostrNode,
  NostrNodeConfig,
  NostrNodeEvent,
  NostrNodeModule,
} from "./nodes.ts";
import nip1 from "../nips/1/clients.ts?nips=1";

export type ClientConfig = NostrNodeConfig;
export type ClientOptions = Partial<ClientConfig>;

/**
 * A class that represents a remote Nostr client.
 */
export class Client extends NostrNode<
  RelayToClientMessage,
  EventDataTypeRecord
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
    super( // new NostrNode(
      ws,
      { modules: [nip1], ...opts },
    );
    this.ws.addEventListener("message", (ev: MessageEvent<string>) => {
      // TODO: Validate the type of the message.
      const message = JSON.parse(ev.data) as ClientToRelayMessage;
      this.exec("handleClientToRelayMessage", { message });
    });
  }
}

// ------------------------------
// Functions
// ------------------------------

export type ClientModule = NostrNodeModule<FunctionParameterTypeRecord>;

type FunctionParameterTypeRecord = {
  [K in keyof _FunctionParameterTypeRecord]:
    & _FunctionParameterTypeRecord[K]
    & ClientFunctionContext;
};

type _FunctionParameterTypeRecord = {
  "handleClientToRelayMessage": {
    message: ClientToRelayMessage;
  };
  "handleSubscriptionMessage": {
    message: SubscriptionMessage;
    controller: ReadableStreamDefaultController<NostrEvent>;
  } & SubscriptionContext;
  "acceptEvent": {
    event: NostrEvent;
  };
};

interface ClientFunctionContext {
  client: Client;
}

interface SubscriptionContext {
  id: SubscriptionId;
  filters: SubscriptionFilter[];
}

// ------------------------------
// Events
// ------------------------------

type EventDataTypeRecord = {
  [T in SubscriptionId]: SubscriptionMessage;
};

type SubscriptionMessage = {
  [T in ClientToRelayMessageType]: ClientToRelayMessage<T>[1] extends
    SubscriptionId ? ClientToRelayMessage<T> : never;
}[ClientToRelayMessageType];

export class SubscriptionEvent extends NostrNodeEvent<
  EventDataTypeRecord,
  SubscriptionId
> {
  constructor(
    type: SubscriptionId,
    init: MessageEventInit<SubscriptionMessage>,
  ) {
    super(type, init);
  }
}
