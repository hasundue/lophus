import { Relay as _Relay, RelayLike } from "@lophus/nips/relays";
import { RelayGroup, WithPool } from "@lophus/std/relays";
import { EventFilter, EventKind, NostrEvent } from "@lophus/nips";

export class Relay extends WithPool(_Relay) implements RelayLike {}

interface EventSource extends Pick<RelayLike, "config"> {
  list<K extends EventKind>(
    filter: EventFilter<K>,
  ): AsyncIterable<NostrEvent<K>>;
  get<K extends EventKind>(
    filter: EventFilter<K>,
  ): Promise<NostrEvent<K> | undefined>;
}

interface EventStore extends EventSource {
  put<K extends EventKind>(event: NostrEvent<K>): Promise<void>;
}

const knowns = new RelayGroup([
  new Relay("wss://nostr.wine"),
]);

/**
 * Cache of Nostr events that fallbacks to all the known relays.
 */
export const nostr: EventSource = {
  config: { name: "nostr" },
  async get(filter) {
    return await cache.get(filter) ?? _get(knowns, filter);
  },
  list(filter) {
    return knowns.subscribe(filter);
  },
};

export const cache: EventStore = {
  config: { name: "cache" },
  async get<K extends EventKind>(filter: EventFilter<K>) {
    const kv = await Deno.openKv();
    if (filter.ids?.length) {
      return Promise.any(
        filter.ids.map((id) =>
          new Promise<NostrEvent<K>>((resolve, reject) =>
            kv.get<NostrEvent<K>>(["events", id]).then(({ value }) =>
              value ? resolve(value) : reject()
            )
          )
        ),
      ).catch(() => undefined);
    }
  },
};

async function _get<K extends EventKind>(
  source: RelayLike,
  filter: EventFilter<K>,
): Promise<NostrEvent<K> | undefined> {
  const events = await Array.fromAsync(source.subscribe(filter));
  return events.at(0);
}
