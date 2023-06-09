// Stream from multiple relays with a relay pool
import { RelayPool } from "lophus/lib/pools.ts";
import { Timestamp } from "lophus/lib/times.ts";

new RelayPool("wss://nos.lol", "wss://relay.nostr.band")
  .subscribe({ kinds: [1], since: Timestamp.now })
  .pipeTo(new WritableStream({ write: (ev) => console.log(ev) }));
