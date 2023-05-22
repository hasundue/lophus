import { NostrNode } from "./core/nodes.ts";
import {
  ClientToRelayMessage,
  NostrFilter,
  PublishMessage,
  RelayToClientMessage,
  RelayUrl,
  SignedEvent,
  SubscriptionId,
} from "./nips/01.ts";
import { WebSocketEventHooks } from "./core/websockets.ts";
import { distinctBy, merge } from "./core/streams.ts";
import { pipeThroughFrom } from "./core/x/streamtools.ts";

export * from "./nips/01.ts";

export interface RelayConfig {
  name?: string;
  url: RelayUrl;
  read?: boolean;
  write?: boolean;
  on?: WebSocketEventHooks;
}

export interface SubscribeOptions {
  id?: string;
  close_on_eose?: boolean;
}

export class Relay
  extends NostrNode<RelayToClientMessage, ClientToRelayMessage> {
  config: {
    readonly name: string;
    readonly url: RelayUrl;
    read: boolean;
    write: boolean;
  };
  #subs = new Map<SubscriptionId, Subscription>();

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
    filters: NostrFilter | NostrFilter[],
    opts: SubscribeOptions = {},
  ): Subscription {
    const sub = new Subscription(this, filters, opts);
    this.#subs.set(sub.id, sub);
    return sub;
  }

  publish(event: SignedEvent): Promise<void> {
    return this.send(MessagePacker.pack(event));
  }

  get publisher() {
    return pipeThroughFrom(this.messenger, new MessagePacker());
  }
}

export class Subscription {
  readonly id: SubscriptionId;

  #relays: Relay[];
  #filters: NostrFilter[];
  #provider: SubscriptionProvider;

  constructor(
    relays: Relay | Relay[],
    filters: NostrFilter | NostrFilter[],
    opts: SubscribeOptions = {},
  ) {
    this.id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    this.#relays = [relays].flat();
    this.#filters = [filters].flat();

    this.#provider = new SubscriptionProvider({
      id: this.id,
      close_on_eose: opts.close_on_eose ?? false,
    });
  }

  get events(): ReadableStream<SignedEvent> {
    this.#relays.forEach((r) => r.send(["REQ", this.id, ...this.#filters]));

    return merge(
      this.#relays.map((r) => r.messages.pipeThrough(this.#provider)),
    ).pipeThrough(distinctBy((ev) => ev.id));
  }
}

class SubscriptionProvider
  extends TransformStream<RelayToClientMessage, SignedEvent> {
  constructor(opts: Required<SubscribeOptions>) {
    super({
      transform: (msg, controller) => {
        if (msg[0] === "EVENT" && msg[1] === opts.id) {
          controller.enqueue(msg[2]);
        }
        if (
          msg[0] === "EOSE" && msg[1] === opts.id && opts.close_on_eose
        ) {
          controller.terminate();
        }
      },
    });
  }
}

/**
 * A transformer that creates messages from events.
 */
export class MessagePacker
  extends TransformStream<SignedEvent, PublishMessage> {
  constructor() {
    super({
      transform: (event, controller) => {
        controller.enqueue(MessagePacker.pack(event));
      },
    });
  }
  static pack(event: SignedEvent): PublishMessage {
    return ["EVENT", event];
  }
}
