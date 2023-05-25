import type {
  ClientToRelayMessage,
  EventTimestamp,
  RelayToClientMessage,
  RelayUrl,
  SignedEvent,
  SubscriptionFilter,
  SubscriptionId,
} from "./nips/01.ts";
import type { Brand, Replace, Require } from "./core/types.ts";
import type { WebSocketEventHooks } from "./core/websockets.ts";
import {
  InternalMessage,
  MessageBufferConfig,
  NostrNode,
} from "./core/nodes.ts";
import { createDualMarkReadableStream } from "./core/streams.ts";

export * from "./nips/01.ts";

export interface RelayConfig {
  url: RelayUrl;
  name: RelayName;
  read: boolean;
  write: boolean;
  on: WebSocketEventHooks;
  buffer: MessageBufferConfig;
}

export type RelayName = Brand<string, "RelayName">;

export type RelayInit = Require<
  Partial<Replace<RelayConfig, "name", string>>,
  "url"
>;

class RelayConfigImpl implements Required<RelayConfig> {
  readonly name: RelayName;
  readonly url: RelayUrl;
  readonly buffer: MessageBufferConfig;
  readonly on: WebSocketEventHooks;

  #read: boolean;
  #write: boolean;

  constructor(_relay: Relay, init: RelayInit) {
    this.name = (init.name ?? init.url.slice(6).split("/")[0]) as RelayName;
    this.url = init.url as RelayUrl;
    this.buffer = init.buffer ?? { high: 20 };
    this.on = init.on ?? {};
    this.#read = init.read ?? true;
    this.#write = init.write ?? true;
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

export interface SubscriptionOptions {
  id?: string;
  realtime?: boolean;
  buffer?: MessageBufferConfig;
}

export class Relay
  extends NostrNode<RelayToClientMessage, ClientToRelayMessage> {
  readonly config: RelayConfig;

  constructor(
    init: RelayInit | RelayUrl,
    config?: RelayConfig,
  ) {
    const url = typeof init === "string" ? init : init.url;
    super(
      () => new WebSocket(url),
      { buffer: { high: 20 }, ...config },
    );
    this.config = new RelayConfigImpl(this, { ...config, url });
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
          this.channel(ch);
          this.send(["REQ", id, ...fs]);
        },
        stop: () => this.close(id),
        restart: () => this.send(["REQ", id, ...since(last)]),
        cancel: () => {
          ch.close();
          this.unchannel(ch);
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
