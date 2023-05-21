import { NostrNode } from "./mod.ts";
import {
  ClientToRelayMessage,
  EventId,
  Filter,
  PublishMessage,
  RelayToClientMessage,
  RelayUrl,
  SignedEvent,
  SubscriptionId,
} from "./nips/01.ts";
import { WebSocketEventHooks } from "./lib/websockets.ts";

export * from "./nips/01.ts";

//
// Relay and RelayProvider
//
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
  read = true;
  write = true;

  #subs = new Map<SubscriptionId, Subscription>();

  constructor(protected readonly config: RelayConfig) {
    const on = config.on ?? {};
    super(() => {
      const ws = new WebSocket(config.url);
      for (const type in config.on) {
        // @ts-ignore TODO: fix this
        ws.addEventListener(type, on[type].bind(ws));
      }
      return ws;
    });
  }

  subscribe(
    filter: Filter | Filter[],
    options: SubscribeOptions = {},
  ): Subscription {
    const sub = new Subscription(options);
    this.#subs.set(sub.id, sub);

    const filters = Array.isArray(filter) ? filter : [filter];
    this.send(["REQ", sub.id, ...filters]);

    return sub;
  }

  unsubscribe(id: SubscriptionId) {
    this.#subs.delete(id);
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
        controller.enqueue(["EVENT", event]);
      },
    });
  }
}

/**
 * A transformer that filters out non-event messages.
 */
export class Subscription
  extends TransformStream<RelayToClientMessage, SignedEvent> {
  readonly id: SubscriptionId;
  #recieved = new Set<EventId>();

  constructor(opts: SubscribeOptions) {
    const id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    super({
      transform: (msg, controller) => {
        if (
          msg[0] === "EVENT" && msg[1] === id && !this.#recieved.has(msg[2].id)
        ) {
          this.#recieved.add(msg[2].id);
          controller.enqueue(msg[2] as SignedEvent);
        }
        if (
          msg[0] === "EOSE" && msg[1] === id && opts.close_on_eose
        ) {
          controller.terminate();
        }
      },
    });
    this.id = id;
  }
}
