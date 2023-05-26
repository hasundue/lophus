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
import { WebSocketEventHooks } from "./core/websockets.ts";
import { NostrNode } from "./core/nodes.ts";
import { broadcast } from "./core/streams.ts";
import { push } from "./core/x/streamtools.ts";

export * from "./nips/01.ts";

/**
 * A class that represents a remote Nostr Relay.
 */
export class Relay
  extends NostrNode<RelayToClientMessage, ClientToRelayMessage> {
  readonly config: Readonly<RelayConfig>;

  // Writable ends of branched streams of messages from the relay.
  #receivers: WritableStream<RelayToClientMessage>[] = [];

  // Readable ends of messages to the relay.
  #senders: ReadableStream<ClientToRelayMessage>[] = [];

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
    const ch = new TransformStream<
      ClientToRelayMessage,
      RelayToClientMessage
    >();

    const sub = new SubscriptionProvider(ch.writable, [filter].flat(), {
      id: opts.id ?? crypto.randomUUID() as SubscriptionId,
      realtime: opts.realtime ?? true,
      nbuffer: opts.nbuffer ?? this.config.nbuffer,
    });

    this.#subs.set(sub.id, sub);
    this.#receivers.push(sub.reciever);
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

    this.#receivers.push(this.#notices.writable);
    this.#broadcast(); // async

    return this.#notices.readable;
  }

  async #broadcast(): Promise<void> {
    if (this.messages.locked) {
      return; // already broadcasting
    }
    await broadcast(this.messages, this.#receivers);
  }

  async close() {
    await Promise.all(this.#receivers.map((ch) => ch.close()));
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
  readonly reciever: WritableStream<RelayToClientMessage>;

  constructor(
    sender: WritableStream<ClientToRelayMessage>,
    readonly filter: SubscriptionFilter[],
    readonly opts: SubscriptionOptions,
  ) {
    const id = opts.id as SubscriptionId;

    let this_controller: ReadableStreamDefaultController<SignedEvent>;
    // let last: EventTimestamp;

    // const since = (since?: EventTimestamp) =>
    //   filter.map((f) => ({ since, ...f }));

    super({ // new ReadableStream({
      start(controller) {
        this_controller = controller;
        push(sender, ["REQ", id, ...filter]);
      },
      // pull: () => relay.connected,
      cancel: () => push(sender, ["CLOSE", id]),
    }, new CountQueuingStrategy({ highWaterMark: opts.nbuffer }));

    this.id = opts.id as SubscriptionId;

    this.reciever = new WritableStream<RelayToClientMessage>({
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
