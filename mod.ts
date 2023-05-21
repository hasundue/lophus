import {
  Filter,
  NostrMessage,
  SignedEvent,
  SubscriptionId,
} from "./nips/01.ts";
import { LazyWebSocket, WebSocketEventHooks } from "./lib/websockets.ts";
import { Mutex } from "./lib/x/async.ts";

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
  #writer_mutex = new Mutex();

  constructor(
    protected createWebSocket: () => WebSocket,
    protected on: NostrEventHooks,
  ) {
    this.#ws = new LazyWebSocket(createWebSocket, on);
  }

  get messages() {
    return new ReadableStream<R>({
      start: (controller) => {
        this.#ws.addEventListener("message", (ev: MessageEvent<string>) => {
          const msg = JSON.parse(ev.data) as R;
          controller.enqueue(msg);
        });
      },
    });
  }

  get events(): ReadableStream<SignedEvent> {
    return this.messages.pipeThrough(new EventStreamProvider());
  }

  get sender() {
    return new WritableStream<W>({
      write: (msg) => this.#ws.send(JSON.stringify(msg)),
    });
  }

  async send(...msgs: W[]): Promise<void> {
    for (const msg of msgs) {
      await this.#writer_mutex.acquire();
      const writer = this.sender.getWriter();

      await writer.ready;
      await writer.write(msg).catch(console.error);

      await writer.ready;
      writer.releaseLock();
      this.#writer_mutex.release();
    }
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
