import {
  Filter,
  NostrMessage,
  SignedEvent,
  SubscriptionId,
} from "./nips/01.ts";
import { LazyWebSocket, WebSocketEventHooks } from "./lib/websockets.ts";

export type NostrEventHooks =
  & RelayToClientEventHooks
  & ClientToRelayEventHooks;

export type RelayToClientEventHooks =
  & WebSocketEventHooks
  & RelayToClientMessageHooks;

export type RelayToClientMessageHooks = {
  "event": (id: SubscriptionId, event: SignedEvent) => void;
  "eose": (id: SubscriptionId) => void;
  "notice": (message: string) => void;
};

export type ClientToRelayEventHooks =
  & WebSocketEventHooks
  & RelayToClientMessageHooks;

export type ClientToRelayMessageHooks = {
  "publish": (event: SignedEvent) => void;
  "subscribe": (id: SubscriptionId, ...filter: Filter[]) => void;
  "close": (id: SubscriptionId) => void;
};

export class NostrNode<
  R extends NostrMessage = NostrMessage,
  W extends NostrMessage = NostrMessage,
> {
  #ws: LazyWebSocket;

  constructor(protected createWebSocket: () => WebSocket) {
    this.#ws = new LazyWebSocket(createWebSocket);
  }

  get messages() {
    return new ReadableStream<R>({
      start: (controller) => {
        this.#ws.addEventListener("message", (ev: MessageEvent<string>) => {
          controller.enqueue(JSON.parse(ev.data));
        });
      },
    });
  }

  get messenger() {
    return new WritableStream<W>({
      write: (msg) => this.#ws.send(JSON.stringify(msg)),
    });
  }

  async send(...msgs: W[]): Promise<void> {
    const writer = this.messenger.getWriter();
    for (const msg of msgs) {
      await writer.ready;
      writer.write(msg).catch(console.error);
    }
    writer.close();
  }
}

export class EventStreamProvider<R extends NostrMessage>
  extends TransformStream<R, SignedEvent> {
  constructor() {
    super({
      transform: (msg, controller) => {
        if (msg[0] === "EVENT") {
          // TypeScript is not smart enough so we have to use `as` here.
          controller.enqueue(msg[msg.length > 2 ? 2 : 1] as SignedEvent);
        }
      },
    });
  }
}
