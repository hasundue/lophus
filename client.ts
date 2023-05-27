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
import { Broadcaster } from "./core/streams.ts";
// import { allof } from "./core/utils.ts";

export * from "./nips/01.ts";

/**
 * A class that represents a remote Nostr Relay.
 */
export class Relay
  extends NostrNode<RelayToClientMessage, ClientToRelayMessage> {
  readonly config: Readonly<RelayConfig>;

  #subscriptions = new Map<SubscriptionId, SubscriptionProvider>();
  #notices?: TransformStream<RelayToClientMessage, NoticeBody>;
  #broadcaster?: Broadcaster<RelayToClientMessage>;

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

  protected get broadcaster(): Broadcaster<RelayToClientMessage> {
    return this.#broadcaster ??= new Broadcaster(this.messages);
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
    this.broadcaster.addTarget(sub.channel).start();

    return sub;
  }

  async notices() {
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

    await this.broadcaster.addTarget(this.#notices.writable).start();

    return this.#notices.readable;
  }

  async close() {
    await this.#broadcaster?.close();
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
  readonly channel: WritableStream<RelayToClientMessage>;

  constructor(
    relay: Relay,
    readonly filter: SubscriptionFilter[],
    readonly opts: SubscriptionOptions,
  ) {
    const id = opts.id as SubscriptionId;

    const writer = relay.getWriter();
    let this_controller: ReadableStreamDefaultController<SignedEvent>;
    // let last: EventTimestamp;

    // const since = (since?: EventTimestamp) =>
    //   filter.map((f) => ({ since, ...f }));

    super({ // new ReadableStream({
      start(controller) {
        this_controller = controller;
        return writer.write(["REQ", id, ...filter]);
      },
      // pull: () => relay.connected,
      cancel: async () => {
        await writer.write(["CLOSE", id]),
        await writer.close();
      },
    }, new CountQueuingStrategy({ highWaterMark: opts.nbuffer }));

    this.id = opts.id as SubscriptionId;

    this.channel = new WritableStream<RelayToClientMessage>({
      write: (msg) => {
        if (msg[0] === "EOSE" && msg[1] === id && !opts.realtime) {
          this_controller!.close();
        } else if (msg[0] === "EVENT" && msg[1] === id) {
          // last = msg[2].created_at;
          this_controller!.enqueue(msg[2]);
        }
      },
      close: () => this.cancel(),
    }, new CountQueuingStrategy({ highWaterMark: opts.nbuffer }));
  }
}
