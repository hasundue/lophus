import {
  ClientToRelayMessage,
  Relay,
  RelayInit,
  SignedEvent,
  SubscriptionFilter,
  SubscriptionId,
  SubscriptionOptions,
} from "../client.ts";
import { broadcast } from "../core/streams.ts";
import { distinctBy, merge } from "../lib/streams.ts";

/**
 * A pool of relays that can be used as a single relay.
 */
export class RelayPool implements Omit<Relay, "config"> {
  #relays: Relay[];

  constructor(...init: RelayInit[]) {
    this.#relays = init.map((i) => new Relay(i));
  }

  // ----------------------
  // RelayPool methods
  // ----------------------

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
    opts: SubscriptionOptions = {},
  ) {
    const chs = this.relays_read.map((r) => r.subscribe(filter, opts));
    return merge(chs).pipeThrough(distinctBy((m) => m.id));
  }

  publish(event: SignedEvent) {
    return Promise.race(
      this.relays_write.map((r) => r.publish(event)),
    );
  }

  get publisher() {
    const ch = new TransformStream<SignedEvent, SignedEvent>();
    broadcast(ch.readable, this.relays_write.map((r) => r.publisher));
    return ch.writable;
  }

  // ----------------------
  // NostrNode methods
  // ----------------------

  close(sid?: SubscriptionId) {
    return Promise.race(this.#relays.map((r) => r.close(sid)));
  }

  send(msg: ClientToRelayMessage) {
    return Promise.race(
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
