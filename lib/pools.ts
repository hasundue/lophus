import {
  ClientToRelayMessage,
  NostrEvent,
  Relay,
  RelayUrl,
  RelayInit,
  SubscriptionFilter,
  SubscriptionId,
  SubscriptionOptions,
} from "../client.ts";
import { broadcast } from "../core/streams.ts";
import { distinctBy, merge } from "../lib/streams.ts";

export type RelayLike = Relay | RelayPool;

/**
 * A pool of relays that can be used as a single relay.
 */
export class RelayPool implements Omit<Relay, "config"> {
  #relays: Relay[];

  constructor(...init: (RelayUrl | RelayInit)[]) {
    this.#relays = init.map((i) => new Relay(i));
  }

  //-----------------------
  // RelayPool methods
  //-----------------------

  get relays() {
    return this.#relays;
  }

  protected get relays_read() {
    return this.#relays.filter((r) => r.config.read);
  }

  protected get relays_write() {
    return this.#relays.filter((r) => r.config.write);
  }

  // ----------------------
  // Relay methods
  // ----------------------

  subscribe(
    filter: SubscriptionFilter | SubscriptionFilter[],
    opts: Partial<SubscriptionOptions> = {},
  ) {
    const chs = this.relays_read.map((r) => r.subscribe(filter, opts));
    return merge(chs).pipeThrough(distinctBy((m) => m.id));
  }

  // ----------------------
  // NostrNode methods
  // ----------------------

  async close() {
    await Promise.all(this.#relays.map((r) => r.close()));
  }

  async send(msg: ClientToRelayMessage) {
    await Promise.all(
      this.relays_write.map((r) => r.send(msg)),
    );
  }

  get messenger() {
    const ch = new TransformStream<
      ClientToRelayMessage,
      ClientToRelayMessage
    >();
    broadcast(ch.readable, this.relays_write.map((r) => r.messenger));
    return ch.writable;
  }
}
