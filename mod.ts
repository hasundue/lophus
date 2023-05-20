import { WebSocketEventListner } from "./lib/types.ts";
import { SignedEvent, SubscriptionId, Filter } from "./nips/01.ts";

export type NostrMessage = [string, ...unknown[]];

export class NostrNode<
  R extends NostrMessage = NostrMessage,
  W extends NostrMessage = NostrMessage,
> {
  // Readable end
  read = true;
  readonly messages: ReadableStream<R>;
  readonly events: ReadableStream<SignedEvent>;

  // Writable end
  write = true;
  readonly writable: WritableStream<W>;
  readonly publish: (event: SignedEvent) => void;
  
  constructor(private ws: WebSocket) {
    this.messages = new ReadableStream<R>({
      start: (controller) => {
        this.#ws.onmessage = (ev: MessageEvent<string>) => {
          const msg = JSON.parse(ev.data) as RelayToClientMessage;
          controller.enqueue(msg);
        };
      },
    });
    this.writable = new WritableStream<ClientToRelayMessage>({
      write: async (msg) => {
        await this.ws_ready;
        this.#ws.send(JSON.stringify(msg));
      },
      close: async () => {
        await this.ws_ready;
        this.#ws.close();
      },
    });
  }
}

export type RelayToClientEventListener =
  & WebSocketEventListner
  & RelayToClientMessageListener;

export type RelayToClientMessageListener = {
  "event": (id: SubscriptionId, event: SignedEvent) => void;
  "eose": (id: SubscriptionId) => void;
  "notice": (message: string) => void;
};

export type ClientToRelayEventListener =
  & WebSocketEventListner
  & RelayToClientMessageListener;

export type ClientToRelayMessageListener = {
  "publish": (event: SignedEvent) => void;
  "subscribe": (id: SubscriptionId, ...filter: Filter[]) => void;
  "close": (id: SubscriptionId) => void;
};

export type NostrEventListener =
  & RelayToClientEventListener
  & ClientToRelayEventListener;
