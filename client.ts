import { NostrNode } from "./core/nodes.ts";
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
import { WebSocketEventHooks } from "./core/websockets.ts";
import { pipeThroughFrom } from "./core/x/streamtools.ts";

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
    filters: Filter | Filter[],
    opts: SubscribeOptions = {},
  ): Subscription {
    const id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;

    const provider = new SubscriptionProvider({
      id,
      close_on_eose: opts.close_on_eose ?? true,
    });
    const sub = this.messages.pipeThrough(provider);
    this.#subs.set(id, sub);

    this.send(["REQ", id, ...[filters].flat()]);
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
  #filters: Filter[];
  #provider: SubscriptionProvider;

  constructor(
    relays: Relay | Relay[],
    filters: Filter | Filter[],
    opts: SubscribeOptions = {},
  ) {
    this.id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    this.#relays = [relays].flat();
    this.#filters = [filters].flat();

    const provider = new SubscriptionProvider({
      id: this.id,
      close_on_eose: opts.close_on_eose ?? false,
    });
    const sub = this.messages.pipeThrough(provider);
    this.#subs.set(id, sub);

    this.send(["REQ", id, ...[filters].flat()]);
  }

  get events() {
    return this.#relays[0].messages.pipeThrough(this.#provider);
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

  constructor(opts: Required<SubscribeOptions>) {
    super({
      transform: (msg, controller) => {
        if (
          msg[0] === "EVENT" && msg[1] === opts.id &&
          !this.#recieved.has(msg[2].id)
        ) {
          this.#recieved.add(msg[2].id);
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
