import type {
  ClientToRelayMessage,
  NostrEvent,
  RelayToClientMessage,
  SubscriptionFilter,
} from "./core/types.ts";
import { SubscriptionId } from "./core/types.ts";
import { NostrNode, NostrNodeConfig } from "./core/nodes.ts";

export * from "./core/types.ts";

/**
 * A class that represents a remote Nostr client.
 */
export class Client extends NostrNode<RelayToClientMessage> {
  declare ws: WebSocket;
  #events: ReadableStream<NostrEvent>;
  #requests: ReadableStream<[SubscriptionId, SubscriptionFilter]>;

  /**
   * Writable interface for the subscriptions.
   */
  readonly subscriptions = new Map<
    SubscriptionId,
    WritableStream<NostrEvent>
  >();

  constructor(
    ws: WebSocket,
    opts?: ClientOptions,
  ) {
    super( // new NostrNode(
      ws,
      { nbuffer: 10, ...opts },
    );
    let enqueueEvent: (ev: NostrEvent) => void;
    this.#events = new ReadableStream<NostrEvent>({
      start: (controller) => {
        enqueueEvent = controller.enqueue.bind(controller);
      },
    });
    let enqueueRequest: (req: [SubscriptionId, SubscriptionFilter]) => void;
    this.#requests = new ReadableStream<[SubscriptionId, SubscriptionFilter]>({
      start: (controller) => {
        enqueueRequest = controller.enqueue.bind(controller);
      },
    });
    this.ws.addEventListener("message", (ev: MessageEvent<string>) => {
      // TODO: Validate the type of the message.
      const msg = JSON.parse(ev.data) as ClientToRelayMessage;
      // TODO: Apply backpressure when a queue is full.
      const kind = msg[0];
      if (kind === "EVENT") {
        return enqueueEvent(msg[1]);
      }
      const id = msg[1];
      if (kind === "CLOSE") {
        const sub = this.subscriptions.get(id);
        if (!sub) {
          return;
        }
        this.subscriptions.delete(id);
        return sub.close();
      }
      // kind === "REQ"
      const filter = msg[2];
      const writer = this.getWriter();
      const writable = new WritableStream<NostrEvent>({
        write: (event) => {
          return writer.write(["EVENT", id, event]);
        },
      });
      this.subscriptions.set(id, writable);
      return enqueueRequest([id, filter]);
    });
  }

  get events(): ReadableStream<NostrEvent> {
    return this.#events;
  }

  get requests(): ReadableStream<[SubscriptionId, SubscriptionFilter]> {
    return this.#requests;
  }
}

export type ClientConfig = NostrNodeConfig;
export type ClientOptions = Partial<ClientConfig>;
