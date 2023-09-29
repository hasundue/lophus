// Stream from multiple relays with a relay pool
import { RelayPool } from "../../../lib/pools.ts";
import { Timestamp } from "../../../lib/times.ts";
import { ConsoleLogger } from "../../../lib/logging.ts";

new RelayPool("wss://nos.lol", "wss://relay.nostr.band")
  .subscribe({ kinds: [1], since: Timestamp.now })
  .pipeTo(new ConsoleLogger());
