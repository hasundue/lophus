import { NostrNode } from "./core/nodes.ts";
import type {
  ClientToRelayMessage,
  NostrFilter,
  PublishMessage,
  RelayToClientMessage,
  RelayUrl,
  SignedEvent,
  SubscriptionId,
} from "./nips/01.ts";
import type { WebSocketEventHooks } from "./core/websockets.ts";
import { distinctBy, merge } from "./core/streams.ts";
import { pipeThroughFrom } from "./core/x/streamtools.ts";
import { Notify } from "./core/x/async.ts";

export * from "./nips/01.ts";

export interface RelayConfig {
  name?: string;
  url: RelayUrl;
  read?: boolean;
  write?: boolean;
  on?: WebSocketEventHooks;
}

export class Relay
  extends NostrNode<RelayToClientMessage, ClientToRelayMessage> {
  config: {
    readonly name: string;
    readonly url: RelayUrl;
    read: boolean;
    write: boolean;
  };

  constructor(config: RelayConfig) {
    super(() => {
      const ws = new WebSocket(config.url);
      for (const type in config.on) {
        // @ts-ignore TODO: This should be safe
        ws.addEventListener(type, config.on[type].bind(ws));
      }
      return ws;
    });
    this.config = {
      name: config.name ?? config.url,
      url: config.url,
      read: config.read ?? true,
      write: config.write ?? true,
    };
  }

  subscribe(
    filter: NostrFilter | NostrFilter[],
    opts: SubscribeOptions = {},
  ) {
    return new Subscription([this], [filter].flat(), opts);
  }

  publish(event: SignedEvent): Promise<void> {
    return this.send(MessagePacker.pack(event));
  }

  get publisher() {
    return pipeThroughFrom(this.messenger, new MessagePacker());
  }
}

export interface SubscribeOptions {
  id?: string;
  realtime?: boolean;
}

export class Subscription {
  readonly id: SubscriptionId;
  readonly realtime: boolean;

  #closed = new Notify();
  #relays: Relay[];
  #filters: NostrFilter[];
  #provider: TransformStream<RelayToClientMessage, SignedEvent>;

  constructor(
    relays: Relay[],
    filters: NostrFilter[],
    opts: SubscribeOptions = {},
  ) {
    this.id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    this.realtime = opts.realtime ?? true;
    this.#relays = relays;
    this.#filters = filters;

    this.#provider = new TransformStream<RelayToClientMessage, SignedEvent>({
      transform: (msg, controller) => {
        if (msg[0] === "EVENT" && msg[1] === this.id) {
          controller.enqueue(msg[2]);
        }
        if (
          msg[0] === "EOSE" && msg[1] === this.id && !this.realtime
        ) {
          controller.terminate();
          this.#closed.notifyAll();
        }
      },
    });
  }

  get events(): ReadableStream<SignedEvent> {
    this.#relays.forEach((r) => r.send(["REQ", this.id, ...this.#filters]));
    return merge(
      this.#relays.map((r) => r.messages.pipeThrough(this.#provider)),
    ).pipeThrough(distinctBy((ev) => ev.id));
  }

  async close() {
    await Promise.all(this.#relays.map((r) => r.send(["CLOSE", this.id])));
    this.#closed.notifyAll();
  }

  get closed() {
    return this.#closed.notified();
  }
}

/**
 * A transformer that creates messages from events.
 */
export class MessagePacker
  extends TransformStream<SignedEvent, PublishMessage> {
  constructor() {
    super({
      transform(event, controller) {
        controller.enqueue(MessagePacker.pack(event));
      },
    });
  }
  static pack(event: SignedEvent): PublishMessage {
    return ["EVENT", event];
  }
}
