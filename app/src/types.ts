import { Timestamp } from "@lophus/lib/times";
import { NostrEvent, PublicKey } from "@lophus/core/protocol";
import { RelayLike } from "@lophus/core/relays";

export interface FeedProps {
  me: PublicKey;
  source: RelayLike;
  since: Timestamp;
}

export interface FeedProvider {
  (props: FeedProps): ReadableStream<NostrEvent>;
}
