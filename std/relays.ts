import { mergeReadableStreams as merge } from "@std/streams";
import { DistinctStream } from "@lophus/lib/streams";
import type {
  ClientToRelayMessage,
  EventKind,
  NostrEvent,
  RelayUrl,
  SubscriptionFilter,
} from "@lophus/core/protocol";
import {
  Relay,
  RelayLike,
  RelayLikeConfig,
  RelayLikeOptions,
  RelayOptions,
  SubscriptionOptions,
} from "@lophus/core/relays";

/**
 * A group of relays that can be used as a single relay.
 */
export class RelayGroup implements RelayLike {
  readonly writable: WritableStream<ClientToRelayMessage>;
  readonly config: Readonly<RelayLikeConfig>;
  #relays_read: RelayLike[];
  #relays_write: RelayLike[];

  constructor(readonly relays: RelayLike[], options?: RelayLikeOptions) {
    this.writable = new WritableStream({
      async write(msg) {
        await Promise.all(relays.map((r) => r.send(msg)));
      },
    });
    this.config = {
      name: relays.map((r) => r.config.name).join(", "),
      read: true,
      write: true,
      ...options,
    };
    this.#relays_read = this.relays.filter((r) => r.config.read);
    this.#relays_write = this.relays.filter((r) => r.config.write);
  }

  // ----------------------
  // Relay methods
  // ----------------------

  subscribe<K extends EventKind>(
    filter: SubscriptionFilter<K> | SubscriptionFilter<K>[],
    opts: Partial<SubscriptionOptions> = {},
  ): ReadableStream<NostrEvent<K>> {
    const subs = this.#relays_read.map((r) => r.subscribe(filter, opts));
    return merge(...subs).pipeThrough(new DistinctStream((m) => m.id));
  }

  async publish<K extends EventKind>(
    msg: NostrEvent<K>,
  ) {
    await Promise.all(this.#relays_write.map((r) => r.publish(msg)));
  }

  // ----------------------
  // NostrNode methods
  // ----------------------

  async send(msg: ClientToRelayMessage) {
    await Promise.all(this.relays.map((r) => r.send(msg)));
  }

  async close() {
    await Promise.resolve();
  }
}

export interface WithPool<
  R extends typeof Relay,
> {
  pool: Map<RelayUrl, InstanceType<R>>;
  new (url: RelayUrl, options?: RelayOptions): InstanceType<R>;
}

export function WithPool<
  R extends typeof Relay,
>(
  BaseRelay: R,
): WithPool<R> {
  // @ts-ignore allow concrete arguments for constructor
  return class Self extends BaseRelay {
    static readonly pool = new Map<RelayUrl, InstanceType<R>>();

    constructor(
      url: RelayUrl,
      options?: RelayOptions,
    ) {
      const pooled = Self.pool.get(url);
      if (pooled) {
        return pooled;
      }
      super(url, options);
      Self.pool.set(url, this as InstanceType<R>);
      return this;
    }

    override close() {
      Self.pool.delete(this.config.url);
      return super.close();
    }
  };
}
