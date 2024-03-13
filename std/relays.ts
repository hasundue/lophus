import { mergeReadableStreams as merge } from "@std/streams";
import type {
  ClientToRelayMessage,
  EventKind,
  NostrEvent,
  SubscriptionFilter,
} from "../core/protocol.ts";
import {
  RelayLike,
  RelayLikeConfig,
  RelayLikeOptions,
  SubscriptionOptions,
} from "../core/relays.ts";
import { Distinctor } from "../lib/streams.ts";

/**
 * A pool of relays that can be used as a single relay.
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
  ) {
    const subs = this.#relays_read.map((r) => r.subscribe(filter, opts));
    return merge(...subs).pipeThrough(new Distinctor((m) => m.id));
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
    await Promise.all(this.relays.map((r) => r.close()));
  }
}
