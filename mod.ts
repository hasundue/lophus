import { WebSocketEventHooks } from "./lib/types.ts";
import {
  Filter,
  NostrMessage,
  SignedEvent,
  SubscriptionId,
} from "./nips/01.ts";
import { Mutex, Notify } from "./lib/x/async.ts";

export abstract class NostrNode<
  R extends NostrMessage = NostrMessage,
  W extends NostrMessage = NostrMessage,
> {
  // Websocket
  #ws_notifier = new Notify();

  // Readable end
  readonly messages: ReadableStream<R>;
  abstract events_provider: EventStreamProvider<R>;

  // Writable end
  readonly sender: WritableStream<W>;
  #writer_mutex = new Mutex();

  constructor(
    protected ws: WebSocket,
    protected reconnect: () => WebSocket,
    on: NostrEventHooks,
  ) {
    this.messages = new ReadableStream<R>({
      start: (controller) => {
        this.ws.onmessage = (ev: MessageEvent<string>) => {
          const msg = JSON.parse(ev.data) as R;
          controller.enqueue(msg);
        };
      },
    });
    this.sender = new WritableStream<W>({
      write: async (msg) => {
        await this.ws_ready;
        this.ws.send(JSON.stringify(msg));
      },
      close: async () => {
        await Promise.all([
          async () => {
            await this.ws_ready;
            this.ws.close();
          },
          this.messages.cancel(),
          this.sender.close(),
        ]);
      },
    });
  }

  get ws_ready(): Promise<void> {
    return (async () => {
      switch (this.ws.readyState) {
        case WebSocket.CONNECTING:
          await this.#ws_notifier.notified();
          /* falls through */
        case WebSocket.OPEN:
          break;

        case WebSocket.CLOSING:
          await this.#ws_notifier.notified();
          /* falls through */
        case WebSocket.CLOSED:
          this.ws = this.reconnect();
          await this.#ws_notifier.notified();
          break;
      }
    })();
  }

  get events(): ReadableStream<SignedEvent> {
    return this.messages.pipeThrough(this.events_provider);
  }

  async send(msg: W): Promise<void> {
    await this.#writer_mutex.acquire();
    const writer = this.sender.getWriter();

    await writer.ready;
    await writer.write(msg).catch(console.error);

    await writer.ready;
    writer.releaseLock();
    this.#writer_mutex.release();
  }
}

export class EventStreamProvider<R extends NostrMessage>
  extends TransformStream<R, SignedEvent> {
  constructor() {
    super({
      transform: (msg, controller) => {
        if (msg[0] === "EVENT") {
          // TypeScript is not smart enough. See ./nips/01.ts for details.
          const event = (msg.length > 2 ? msg[2] : msg[1]) as SignedEvent;
          controller.enqueue(event);
        }
      },
    });
  }
}

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

export type ClientToRelayMessageHook = {
  "publish": (event: SignedEvent) => void;
  "subscribe": (id: SubscriptionId, ...filter: Filter[]) => void;
  "close": (id: SubscriptionId) => void;
};
