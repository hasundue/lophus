import type {
  NoticeBody,
  ClientToRelayMessage,
  EventTimestamp,
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
      id: opts.id ?? crypto.randomUUID(),
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
    });

    this.#chs.push(this.#notices.writable);
    this.#broadcast(); // async

    return this.#notices.readable;
  }

  async #broadcast(): Promise<void> {
    if (this.#chs.length > 0) {
      return; // already broadcasting
    }
    await broadcast(this.messages, this.#chs);
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

  #controller?: ReadableStreamDefaultController<SignedEvent>;
  #last?: EventTimestamp;

  constructor(
    ws: LazyWebSocket,
    relay: Relay,
    readonly filter: SubscriptionFilter[],
    readonly opts: SubscriptionOptions,
  ) {
    const since = (since?: EventTimestamp) =>
      filter.map((f) => ({ since, ...f }));

    super({
      start: (con) => {
        relay.send(["REQ", this.id, ...filter]);
        this.#controller = con;
      },
      pull: () => ws.ready,
      cancel: () => relay.send(["CLOSE", this.id]),
    }, new CountQueuingStrategy({ highWaterMark: relay.config.nbuffer }));

    this.id = opts.id as SubscriptionId;

    this.ch = new WritableStream<RelayToClientMessage>({
      write: (msg) => {
        if (msg[0] === "EOSE" && msg[1] === this.id && !this.opts.realtime) {
          this.#controller!.close();
        } else if (msg[0] === "EVENT" && msg[1] === this.id) {
          this.#last = msg[2].created_at;
          this.#controller!.enqueue(msg[2]);
        }
      },
    }, new CountQueuingStrategy({ highWaterMark: relay.config.nbuffer }));

    // Try resuming subscription when the connection is closed.
    ws.addEventListener("close", () => {
      relay.send(["REQ", this.id, ...since(this.#last)]);
    });
  }
}
