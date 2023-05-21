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

export type Subscription = ReadableStream<SignedEvent>;

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
        ws.addEventListener(type, on[type].bind(ws));
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
    filter: Filter | Filter[],
    opts: SubscribeOptions = {},
  ): Subscription {
    const filter_list = Array.isArray(filter) ? filter : [filter];

    const id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    const provider = new SubscriptionProvider({ ...opts, id });

    const sub = this.messages.pipeThrough(provider);
    this.#subs.set(id, sub);

    this.send(["REQ", id, ...filter_list]);
    return sub;
  }

  unsubscribe(id: SubscriptionId) {
    this.send(["CLOSE", id]);
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
        controller.enqueue(MessagePacker.pack(event));
      },
    });
  }
  static pack(event: SignedEvent): PublishMessage {
    return ["EVENT", event];
  }
}

/**
 * A transformer that filters out non-event messages.
 */
class SubscriptionProvider
  extends TransformStream<RelayToClientMessage, SignedEvent> {
  #recieved = new Set<EventId>();

  constructor(opts: SubscribeOptions) {
    super({
      transform: (msg, controller) => {
        if (
          msg[0] === "EVENT" && msg[1] === opts.id &&
          !this.#recieved.has(msg[2].id)
        ) {
          this.#recieved.add(msg[2].id);
          controller.enqueue(msg[2] as SignedEvent);
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
