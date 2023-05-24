import { InternalMessage, NostrNode } from "./core/nodes.ts";
import type {
  ClientToRelayMessage,
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
import {
  createImpatientReadableStream,
  type ImpatientStreamQueuingStrategy,
} from "./core/streams.ts";

export * from "./nips/01.ts";

export type EventBufferOptions = ImpatientStreamQueuingStrategy;

export interface RelayConfig {
  name?: string;
  url: RelayUrl;
  on?: WebSocketEventHooks;
  buffer?: EventBufferOptions;
}

export interface SubscriptionOptions {
  id?: string;
  realtime?: boolean;
  buffer?: EventBufferOptions;
}

export class Relay
  extends NostrNode<RelayToClientMessage, ClientToRelayMessage> {
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

    let controller_read: ReadableStreamDefaultController<SignedEvent>;
    let latest: EventTimestamp;

    const readable = createImpatientReadableStream<SignedEvent>({
      start: (controller) => {
        controller_read = controller;
        this.request(id, filters);
      },
      stop: () => this.close(id),
      restart: () => this.request(id, since(filters, latest)),
    });

    const writable = new WritableStream<
      RelayToClientMessage | InternalMessage
    >({
      write: (msg) => {
        if (msg[0] === "EVENT" && msg[1] === id) {
          controller_read.enqueue(msg[2]);
          latest = msg[2].created_at;
        }
        if (msg[0] === "EOSE" && msg[1] === id && !realtime) {
          controller_read.close();
        }
        if (msg[0] === "RESTART") {
          this.request(id, since(filters, latest));
        }
      },
    });

    this.listen(writable);

    return readable;
  }

  async request(id: string, filters: SubscriptionFilter[]) {
    return await this.send(["REQ", id as SubscriptionId, ...filters]);
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
