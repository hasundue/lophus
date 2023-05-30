import {
  ClientToRelayMessage,
  Relay,
  RelayInit,
  RelayLike,
  RelayToClientMessage,
  RelayUrl,
  SubscriptionFilter,
  SubscriptionOptions,
} from "../client.ts";
import {
  NonExclusiveReadableStream,
  NonExclusiveWritableStream,
} from "../core/streams.ts";
import { distinctBy, merge } from "../lib/streams.ts";

/**
 * A pool of relays that can be used as a single relay.
 */
export class RelayPool extends NonExclusiveWritableStream<ClientToRelayMessage>
  implements RelayLike {
  readonly relays: Relay[];

  #relays_read: Relay[];

  constructor(...init: (RelayUrl | RelayInit)[]) {
    const relays = init.map((i) => new Relay(i));
    const writers = relays.filter((r) => r.config.write).map((r) =>
      r.getWriter()
    );

    super({
      async write(msg) {
        await Promise.all(
          writers.map((r) => r.write(msg)),
        );
      },
    }, { highWaterMark: Math.max(...relays.map((r) => r.config.nbuffer)) });

    this.relays = init.map((i) => new Relay(i));
    this.#relays_read = this.relays.filter((r) => r.config.read);
  }

  // ----------------------
  // Relay methods
  // ----------------------

  subscribe(
    filter: SubscriptionFilter | SubscriptionFilter[],
    opts: Partial<SubscriptionOptions> = {},
  ) {
    const chs = this.#relays_read.map((r) => r.subscribe(filter, opts));
    return merge(chs).pipeThrough(distinctBy((m) => m.id));
  }

  // ----------------------
  // NostrNode methods
  // ----------------------

  get messages() {
    return new NonExclusiveReadableStream<RelayToClientMessage>({});
  }

  async close() {
    await Promise.all(this.relays.map((r) => r.close()));
  }
}
