import { NostrNode } from "./core/nodes.ts";
import type {
  ClientToRelayMessage,
  RelayToClientMessage,
  RelayUrl,
  SignedEvent,
  SubscriptionFilter,
  SubscriptionId,
} from "./nips/01.ts";
import type { WebSocketEventHooks } from "./core/websockets.ts";
import { push } from "./core/x/streamtools.ts";

export * from "./nips/01.ts";

export interface RelayConfig {
  name?: string;
  url: RelayUrl;
  on?: WebSocketEventHooks;
}

export class Relay extends NostrNode<ClientToRelayMessage> {
  readonly name: string;
  readonly url: RelayUrl;

  readonly #subscriptions = new Map<
    SubscriptionId,
    TransformStream<SignedEvent, SignedEvent>
  >();

  constructor(config: RelayConfig) {
    super(() => {
      const ws = new WebSocket(config.url);
      for (const type in config.on) {
        // @ts-ignore 7053 - this should be safe
        ws.addEventListener(type, config?.on[type]?.bind(ws));
      }
      ws.addEventListener("message", (event: MessageEvent<string>) => {
        const msg = JSON.parse(event.data) as RelayToClientMessage;
        if (msg[0] !== "NOTICE") {
          const writable = this.#subscriptions.get(msg[1])?.writable;
          if (writable) push(writable, msg[2]);
        }
      });
      return ws;
    });
    this.name = config.name ?? config.url;
    this.url = config.url;
  }

  async request(
    id: string,
    filters: SubscriptionFilter[],
  ) {
    return await this.send(["REQ", id as SubscriptionId, ...filters]);
  }

  subscribe(
    id: string,
    filters: SubscriptionFilter[],
  ): ReadableStream<SignedEvent> {
    const channel = new TransformStream<SignedEvent, SignedEvent>({
      start: () => {
        this.send(["REQ", id as SubscriptionId, ...filters]);
      },
    });
    this.#subscriptions.set(id as SubscriptionId, channel);
    return channel.readable;
  }

  async publish(event: SignedEvent): Promise<void> {
    return await this.send(["EVENT", event]);
  }

  async close(sid?: SubscriptionId) {
    if (!sid) {
      return await super.close();
    }
    return await this.send(["CLOSE", sid]);
  }
}
