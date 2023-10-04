import type {
  ClientToRelayMessage,
  NostrEvent,
  RelayToClientMessage,
  SubscriptionFilter,
  SubscriptionId,
} from "./nips/01.ts";
import { NostrNode, NostrNodeConfig } from "./nodes.ts";

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
    const writer = this.getWriter();
    this.ws.addEventListener("message", async (ev: MessageEvent<string>) => {
      // TODO: Validate the type of the message.
      const msg = JSON.parse(ev.data) as ClientToRelayMessage;

      // TODO: Apply backpressure when a queue is full.

      const kind = msg[0];
      if (kind === "EVENT") {
        const event = msg[1];

        // TODO: Validate the event and send OkMessage<false> if necessary.

        await writer.ready;
        writer.write(["OK", event.id, true, ""]);
        return enqueueEvent(event);
      }
      const sid = msg[1];
      if (kind === "CLOSE") {
        const sub = this.subscriptions.get(sid);
        if (!sub) {
          this.config.logger?.warn?.("Unknown subscription:", sid);
          return;
        }
        this.subscriptions.delete(sid);
        return sub.close();
      }
      if (kind === "REQ") {
        const filter = msg[2];
        this.subscriptions.set(
          sid,
          new WritableStream<NostrEvent>({
            write: async (event) => {
              await writer.ready;
              return writer.write(["EVENT", sid, event]);
            },
          }),
        );
        return enqueueRequest([sid, filter]);
      }
      this.config.logger?.warn?.("Unknown message kind:", kind);
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
