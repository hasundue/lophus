import type {
  ClientToRelayMessage,
  EventTimestamp,
  RelayToClientMessage,
  RelayUrl,
  SignedEvent,
  SubscriptionFilter,
  SubscriptionId,
} from "./nips/01.ts";
import type { WebSocketEventHooks } from "./core/websockets.ts";
import {
  InternalMessage,
  MessageBufferConfig,
  NostrNode,
} from "./core/nodes.ts";
import { createDwReadableStream } from "./core/streams.ts";

export * from "./nips/01.ts";

export interface RelayConfig {
  url: RelayUrl;
  name?: string;
  buffer?: MessageBufferConfig;
  on?: WebSocketEventHooks;
}

export interface SubscriptionOptions {
  id?: string;
  realtime?: boolean;
  buffer?: MessageBufferConfig;
}

export class Relay
  extends NostrNode<RelayToClientMessage, ClientToRelayMessage> {
  readonly name: string;
  readonly url: RelayUrl;

  constructor(config: RelayConfig) {
    super(
      () => new WebSocket(config.url),
      { buffer: { high: 20 }, ...config },
    );
    this.name = config.name ?? config.url;
    this.url = config.url;
  }

  subscribe(
    filter: SubscriptionFilter | SubscriptionFilter[],
    opts: SubscriptionOptions = {},
  ): ReadableStream<SignedEvent> {
    const fs = [filter].flat();
    const id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    const realtime = opts.realtime ?? true;

    let cntr_read: ReadableStreamDefaultController<SignedEvent>;
    let last: EventTimestamp;

    const since = (since: EventTimestamp) => fs.map((f) => ({ since, ...f }));

    const writable = new WritableStream<
      RelayToClientMessage | InternalMessage
    >({
      write: (msg) => {
        if (msg[0] === "EVENT" && msg[1] === id) {
          last = msg[2].created_at;
          return cntr_read.enqueue(msg[2]);
        }
        if (msg[0] === "EOSE" && msg[1] === id && !realtime) {
          return cntr_read.close();
        }
        if (msg[0] === "RESTART") {
          return this.send(["REQ", id, ...since(last)]);
        }
      },
    });

    const readable = createDwReadableStream<SignedEvent>(
      {
        start: (controller) => {
          cntr_read = controller;
          this.channel(writable);
          this.send(["REQ", id, ...fs]);
        },
        stop: () => this.close(id),
        restart: () => this.send(["REQ", id, ...since(last)]),
        cancel: () => this.unchannel(writable),
      },
      { high: 20, ...opts.buffer },
    );

    return readable;
  }

  publish(event: SignedEvent): Promise<void> {
    return this.send(["EVENT", event]);
  }

  get publisher() {
    return new WritableStream<SignedEvent>({
      write: (event) => this.publish(event),
    });
  }

  close(sid?: SubscriptionId) {
    if (!sid) {
      return super.close();
    }
    return this.send(["CLOSE", sid]);
  }
}
