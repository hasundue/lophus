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
import { LazyWebSocket, WebSocketEventHooks } from "./core/websockets.ts";
import { NostrNode } from "./core/nodes.ts";
import { broadcast } from "./core/streams.ts";

export * from "./nips/01.ts";

/**
 * A class that represents a remote Nostr Relay.
 */
export class Relay
  extends NostrNode<RelayToClientMessage, ClientToRelayMessage> {
  readonly config: Readonly<RelayConfig>;

  #chs: WritableStream<RelayToClientMessage>[] = [];
  #subs = new Map<SubscriptionId, SubscriptionProvider>();
  #notices?: TransformStream<RelayToClientMessage, NoticeBody>;

  constructor(
    url: RelayUrl,
    opts?: Partial<RelayOptions>,
  ) {
    // NostrNode
    super(
      () => new WebSocket(url),
      { nbuffer: 10, ...opts },
    );

    this.config = {
      url,
      name: url.slice(6).split("/")[0],
      read: true,
      write: true,
      on: {},
      nbuffer: 10,
      ...opts,
    };
  }

  subscribe(
    filter: SubscriptionFilter | SubscriptionFilter[],
    opts: Partial<SubscriptionOptions> = {},
  ): Subscription {
    const sub = new SubscriptionProvider(this.ws, this, [filter].flat(), {
      id: opts.id ?? crypto.randomUUID() as SubscriptionId,
      realtime: opts.realtime ?? true,
      nbuffer: opts.nbuffer ?? this.config.nbuffer,
    });

    this.#subs.set(sub.id, sub);
    this.#chs.push(sub.ch);
    this.#broadcast(); // async

    return sub;
  }

  get notices(): ReadableStream<NoticeBody> {
    if (this.#notices) {
      return this.#notices.readable;
    }

    this.#notices = new TransformStream({
      transform: (msg, con) => {
        if (msg[0] === "NOTICE") {
          con.enqueue(msg[1]);
        }
      },
      flush: () => this.#notices!.readable.cancel(),
    });

    this.#chs.push(this.#notices.writable);
    this.#broadcast(); // async

    return this.#notices.readable;
  }

  async #broadcast(): Promise<void> {
    if (this.messages.locked) {
      return; // already broadcasting
    }
    await broadcast(this.messages, this.#chs);
  }

  async close() {
    await Promise.all(this.#chs.map((ch) => ch.close()));
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
  id: SubscriptionId;
  // update(filter: SubscriptionFilter | SubscriptionFilter[]): Promise<void>;
}

class SubscriptionProvider extends ReadableStream<SignedEvent>
  implements Subscription {
  readonly id: SubscriptionId;
  readonly ch: WritableStream<RelayToClientMessage>;

  constructor(
    ws: LazyWebSocket,
    relay: Relay,
    readonly filter: SubscriptionFilter[],
    readonly opts: SubscriptionOptions,
  ) {
    const id = opts.id as SubscriptionId;

    let con_this: ReadableStreamDefaultController<SignedEvent>;
    let last: EventTimestamp;

    const since = (since?: EventTimestamp) =>
      filter.map((f) => ({ since, ...f }));

    super({
      start: async (con) => {
        // Expose controller for later use
        con_this = con;

        await relay.send(["REQ", id, ...filter]);

        // Try resuming subscription on reconnect
        ws.addEventListener("open", async () => {
          await relay.send(["REQ", id, ...since(last)]);
        });
      },
      pull: () => ws.ready,
      cancel: () => relay.send(["CLOSE", id]),
    }, new CountQueuingStrategy({ highWaterMark: relay.config.nbuffer }));

    this.id = opts.id as SubscriptionId;

    this.ch = new WritableStream<RelayToClientMessage>({
      write: (msg) => {
        if (msg[0] === "EOSE" && msg[1] === id && !opts.realtime) {
          con_this!.close();
        } else if (msg[0] === "EVENT" && msg[1] === id) {
          last = msg[2].created_at;
          con_this!.enqueue(msg[2]);
        }
      },
      abort: () => this.cancel(),
    }, new CountQueuingStrategy({ highWaterMark: relay.config.nbuffer }));
  }
}
