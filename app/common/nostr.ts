import { Relay as _Relay, RelayLike } from "@lophus/nips/relays";
import { RelayGroup, WithPool } from "@lophus/std/relays";
import { EventFilter, EventKind, NostrEvent } from "@lophus/nips";

export class Relay extends WithPool(_Relay) implements RelayLike {}

export interface EventSource extends Pick<RelayLike, "config"> {
  list<K extends EventKind>(
    filter: EventFilter<K>,
  ): AsyncIterable<NostrEvent<K>>;
  get<K extends EventKind>(
    filter: EventFilter<K>,
  ): Promise<NostrEvent<K> | undefined>;
}

export interface EventStore extends EventSource {
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
  get(filter) {
    return _get(knowns, filter);
  },
  list(filter) {
    return knowns.subscribe(filter);
  },
};

async function _get<K extends EventKind>(
  source: RelayLike,
  filter: EventFilter<K>,
): Promise<NostrEvent<K> | undefined> {
  const events = await Array.fromAsync(source.subscribe(filter));
  return events.at(0);
}
