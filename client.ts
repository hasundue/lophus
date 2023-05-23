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

export * from "./nips/01.ts";

export interface RelayConfig {
  name?: string;
  url: RelayUrl;
  on?: WebSocketEventHooks;
}

export class Relay
  extends NostrNode<RelayToClientMessage, ClientToRelayMessage> {
  readonly name: string;
  readonly url: RelayUrl;

  constructor(config: RelayConfig) {
    super(() => {
      const ws = new WebSocket(config.url);
      for (const type in config.on) {
        // @ts-ignore TODO: This should be safe
        ws.addEventListener(type, config.on[type].bind(ws));
      }
      return ws;
    });
    this.name = config.name ?? config.url;
    this.url = config.url;
  }

  async publish(event: SignedEvent): Promise<void> {
    return await this.send(["EVENT", event]);
  }

  async request(
    id: string,
    filter: SubscriptionFilter | SubscriptionFilter[],
  ) {
    return await this.send(["REQ", id as SubscriptionId, ...[filter].flat()]);
  }

  async close(sid?: SubscriptionId) {
    if (!sid) {
      return await super.close();
    }
    return await this.send(["CLOSE", sid]);
  }
}
