// Stream from multiple relays with a relay pool
import { RelayPool } from "https://deno.land/x/lophus/lib/pools.ts";
import { Timestamp } from "https://deno.land/x/lophus/lib/times.ts";

new RelayPool("wss://nos.lol", "wss://relay.nostr.band")
  .subscribe({ kinds: [1], since: Timestamp.now })
  .pipeTo(new WritableStream({ write: (ev) => console.log(ev) }));
