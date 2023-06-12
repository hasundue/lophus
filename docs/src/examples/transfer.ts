// Transfer your notes from relay to relay
import { Relay } from "../../../client.ts";
import { EventPublisher } from "../../../lib/events.ts";
import { env } from "../../../lib/env.ts";

new Relay("wss://relay.nostr.band")
  .subscribe({
    kinds: [1],
    authors: [env.PUBLIC_KEY],
  }, { realtime: false })
  .pipeTo(new EventPublisher(new Relay("wss://nos.lol"), env.PRIVATE_KEY));
