// Stream from multiple relays with a relay pool
import { RelayPool } from "../lib/pool.ts";
import { Timestamp } from "../lib/times.ts";

new RelayPool(
  { url: "wss://nos.lol", read: true, write: true },
  { url: "wss://relay.nostr.band", read: true, write: false },
)
  .subscribe({ kinds: [1], since: Timestamp.now })
  .pipeTo(new WritableStream({ write: (ev) => console.log(ev) }));
