import {
  Filter,
  NostrMessage,
  RelayToClientMessage,
  SignedEvent,
  SubscriptionId,
} from "./nips/01.ts";
import { LazyWebSocket, WebSocketEventHooks } from "./lib/websockets.ts";

/**
 * Types for event handlers (mainly for debugging)
 */
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

/**
 * A Nostr Relay or Client.
 */
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
        this.#ws.addEventListener("message", (event: MessageEvent<string>) => {
          controller.enqueue(JSON.parse(event.data));
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

/**
 * A transformer that filters out non-event messages.
 */
export class EventStreamProvider<R extends NostrMessage>
  extends TransformStream<R, SignedEvent> {
  constructor() {
    super({
      transform: (msg, controller) => {
        if (msg[0] === "EVENT") {
          const index =
            // See ./nips/01.ts
            this instanceof EventStreamProvider<RelayToClientMessage> ? 2 : 1;
          // TypeScript is not smart enough so we have to use `as` here.
          controller.enqueue(msg[index] as SignedEvent);
        }
      },
    });
  }
}

/**
 * A transformer that creates messages from events.
 */
export class MessagePacker<W extends NostrMessage>
  extends TransformStream<SignedEvent, W> {
  constructor(
    sid: W extends RelayToClientMessage ? SubscriptionId : undefined,
  ) {
    super({
      transform: (event, controller) => {
        const msg = sid ? ["EVENT", sid, event] : ["EVENT", event];
        // TypeScript is not smart enough so we have to use `as` here.
        controller.enqueue(msg as W);
      },
    });
  }
}
