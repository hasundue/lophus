import { NostrNode } from "./core/nodes.ts";
import type {
  ClientToRelayMessage,
  EventId,
  EventTimestamp,
  RelayToClientMessage,
  RelayUrl,
  SignedEvent,
  SubscriptionFilter,
  SubscriptionId,
} from "./nips/01.ts";
import {
  assignEventHooks,
  type WebSocketEventHooks,
} from "./core/websockets.ts";

export * from "./nips/01.ts";

export interface RelayConfig {
  name?: string;
  url: RelayUrl;
  on?: WebSocketEventHooks;
}

export interface SubscriptionOptions {
  id?: string;
  realtime?: boolean;
  nbuffer?: number;
}

export class Relay extends NostrNode<ClientToRelayMessage> {
  readonly name: string;
  readonly url: RelayUrl;

  constructor(config: RelayConfig) {
    super(() => {
      const ws = new WebSocket(config.url);
      assignEventHooks(ws, config.on ?? {});
      return ws;
    });
    this.name = config.name ?? config.url;
    this.url = config.url;
  }

  subscribe(
    filters: SubscriptionFilter[],
    opts: SubscriptionOptions = {},
  ): ReadableStream<SignedEvent> {
    const id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    const realtime = opts.realtime ?? true;

    return new ReadableStream<SignedEvent>({
      start: (controller) => {
        this.handleMessage("EVENT", (ev) => {
          const msg = JSON.parse(ev.data) as RelayToClientMessage;

          if (msg[0] === "EOSE" && msg[1] === id && !realtime) {
            return controller.close();
          }

          if (msg[0] === "EVENT" && msg[1] === id) {
            controller.enqueue(msg[2]);

            if (controller.desiredSize && controller.desiredSize < 1) {
              this.send(["CLOSE", id]);

              if (realtime) {
                filters = since(filters, msg[2].created_at);
              }
            }
          }
        });

        this.send(["REQ", id as SubscriptionId, ...filters]);
      },

      pull: () => {
        this.send(["REQ", id as SubscriptionId, ...filters]);
      },
    }, new CountQueuingStrategy({ highWaterMark: opts.nbuffer ?? 10 }));
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

function since(fs: SubscriptionFilter[], since: EventTimestamp) {
  return fs.map((f) => ({ since, ...f }));
}

class SubscriptionConfig {
  id: SubscriptionId;
  realtime: boolean;
}

export class SubscriptionProvider extends ReadableStream<SignedEvent> {
  readonly config: SubscriptionConfig;

  #filters: SubscriptionFilter[];
  #config: SubscriptionConfig;

  constructor(
    underlyingSource: UnderlyingSource<SignedEvent>,
    strategy: QueuingStrategy<SignedEvent>,
    fs: SubscriptionFilter[],
    opts: SubscriptionOptions = {},
  ) {
    const id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    const realtime = opts.realtime ?? true;

    super(underlyingSource, strategy);
  }
}
