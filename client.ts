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
  ChannelId,
  InternalMessage,
  MessageBufferConfig,
  NostrNode,
} from "./core/nodes.ts";
import {
  createDualMarkReadableStream,
  DualMarkStreamWatermarks,
} from "./core/streams.ts";

export * from "./nips/01.ts";

export interface RelayConfig {
  name: string;
  read: boolean;
  write: boolean;
  on: WebSocketEventHooks;
  buffer: MessageBufferConfig;
}

export type RelayOptions = Partial<RelayConfig>;

export interface SubscriptionOptions {
  id?: string;
  realtime?: boolean;
  buffer?: MessageBufferConfig;
}

export class Relay
  extends NostrNode<RelayToClientMessage, ClientToRelayMessage> {
  readonly url: RelayUrl;
  readonly config: RelayConfig;

  constructor(
    url: RelayUrl,
    opts?: RelayOptions,
  ) {
    super(
      () => new WebSocket(url),
      { buffer: { high: 20 }, ...opts },
    );
    this.url = url;
    this.config = new RelayConfigImpl(this, url, opts ?? {});
  }

  subscribe(
    filter: SubscriptionFilter | SubscriptionFilter[],
    opts: SubscriptionOptions = {},
  ): ReadableStream<SignedEvent> {
    const fs = [filter].flat();
    const id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    const realtime = opts.realtime ?? true;

    let ch_id: ChannelId;
    let cntr_read: ReadableStreamDefaultController<SignedEvent>;
    let last: EventTimestamp;

    const since = (since: EventTimestamp) => fs.map((f) => ({ since, ...f }));

    const ch = new WritableStream<
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

    return createDualMarkReadableStream<SignedEvent>(
      {
        start: (cntr) => {
          cntr_read = cntr;
          ch_id = this.channel(ch);
          this.send(["REQ", id, ...fs]);
        },
        stop: () => this.close(id),
        restart: () => this.send(["REQ", id, ...since(last)]),
        cancel: () => {
          ch.close();
          this.unchannel(ch_id);
          return this.send(["CLOSE", id]);
        },
      },
      { high: 20, ...opts.buffer },
    );
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

class RelayConfigImpl implements Required<RelayOptions> {
  readonly name: string;
  readonly buffer: MessageBufferConfig;
  readonly on: WebSocketEventHooks;

  #relay: Relay;
  #read: boolean;
  #write: boolean;

  constructor(
    relay: Relay,
    url: RelayUrl,
    opts: RelayOptions,
  ) {
    this.#relay = relay;
    this.name = opts.name ?? url.slice(6).split("/")[0];
    this.#read = opts.read ?? true;
    this.#write = opts.write ?? true;
    this.on = opts.on ?? {};
    this.buffer = DualMarkStreamWatermarks.default(opts.buffer ?? { high: 20 });
  }

  get read() {
    return this.#read;
  }

  set read(v: boolean) {
    if (v === this.#read) return;
    this.#read = v;
  }

  get write() {
    return this.#write;
  }

  set write(v: boolean) {
    if (v === this.#write) return;
    this.#write = v;
  }
}
