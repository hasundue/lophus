import type {
  ClientToRelayMessage,
  EventTimestamp,
  NoticeBody,
  RelayToClientMessage,
  RelayUrl,
  SignedEvent,
  SubscriptionFilter,
  SubscriptionId,
} from "./nips/01.ts";
import { NostrNode } from "./core/nodes.ts";
import { WebSocketEventHooks } from "./core/websockets.ts";

export * from "./nips/01.ts";

/**
 * A class that represents a remote Nostr Relay.
 */
export class Relay
  extends NostrNode<RelayToClientMessage, ClientToRelayMessage> {
  readonly config: Readonly<RelayConfig>;

  #subscriptions = new Map<SubscriptionId, SubscriptionProvider>();
  #notices?: ReadableStream<NoticeBody>;

  constructor(
    url: RelayUrl,
    opts?: Partial<RelayOptions>,
  ) {
    // NostrNode
    super(
      () => new WebSocket(url),
      { nbuffer: 10, ...opts },
    );

    // deno-fmt-ignore
    this.config = {
      url, name: url.slice(6).split("/")[0],
      read: true, write: true, on: {}, nbuffer: 10, ...opts,
    };
  }

  subscribe(
    filter: SubscriptionFilter | SubscriptionFilter[],
    opts: Partial<SubscriptionOptions> = {},
  ): Subscription {
    const sub = new SubscriptionProvider(this, [filter].flat(), {
      id: opts.id ?? crypto.randomUUID() as SubscriptionId,
      realtime: opts.realtime ?? true,
      nbuffer: opts.nbuffer ?? this.config.nbuffer,
    });
    this.#subscriptions.set(sub.id, sub);
    return sub;
  }

  get notices(): ReadableStream<NoticeBody> {
    return this.#notices ??= this.messages.pipeThrough(
      new TransformStream<RelayToClientMessage, NoticeBody>({
        transform: (msg, con) => {
          if (msg[0] === "NOTICE") {
            con.enqueue(msg[1]);
          }
        },
      }),
    );
  }

  async close(): Promise<void> {
    await this.#notices?.cancel();
    await Promise.all([...this.#subscriptions.values()].map((s) => s.cancel()));
    await super.close();
  }
}

export interface RelayOptions {
  name: string;
  read: boolean;
  write: boolean;
  on: WebSocketEventHooks;
  nbuffer: number;
}

export interface RelayConfig extends RelayOptions {
  url: RelayUrl;
}

export interface Notice {
  received_at: EventTimestamp;
  content: string;
}

export interface SubscriptionOptions {
  id: string;
  realtime: boolean;
  nbuffer: number;
}

export interface Subscription extends ReadableStream<SignedEvent> {
  readonly id: SubscriptionId;
  // update(filter: SubscriptionFilter | SubscriptionFilter[]): Promise<void>;
}

class SubscriptionProvider extends ReadableStream<SignedEvent>
  implements Subscription {
  readonly id: SubscriptionId;

  constructor(
    relay: Relay,
    readonly filter: SubscriptionFilter[],
    readonly opts: SubscriptionOptions,
  ) {
    const id = opts.id as SubscriptionId;

    const messenger = relay.getWriter();
    let controller_reader: ReadableStreamDefaultController<SignedEvent>;
    // let last: EventTimestamp;

    // const since = (since?: EventTimestamp) =>
    //   filter.map((f) => ({ since, ...f }));

    const writable = new WritableStream<RelayToClientMessage>({
      write: (msg) => {
        if (msg[1] === id) {
          if (msg[0] === "EOSE" && !opts.realtime) {
            return this.cancel();
          } else if (msg[0] === "EVENT") {
            // last = msg[2].created_at;
            controller_reader!.enqueue(msg[2]);
          }
        }
      },
    }, new CountQueuingStrategy({ highWaterMark: opts.nbuffer }));

    const aborter = new AbortController();

    super({ // new ReadableStream({
      start(controller) {
        controller_reader = controller;
        return messenger.write(["REQ", id, ...filter]);
      },
      // pull: () => relay.connected,
      cancel: async () => {
        await messenger.write(["CLOSE", id]);
        messenger.releaseLock();
        aborter.abort();
      },
    }, new CountQueuingStrategy({ highWaterMark: opts.nbuffer }));

    this.id = opts.id as SubscriptionId;

    relay.messages.pipeTo(writable, { signal: aborter.signal }).catch((err) => {
      if (err.name !== "AbortError") throw err;
    });
  }
}
