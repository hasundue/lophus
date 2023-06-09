// Transfer your notes from relay to relay
import { Relay } from "https://deno.land/x/lophus/client.ts";
import { EventPublisher } from "https://deno.land/x/lophus/lib/events.ts";
import { env } from "https://deno.land/x/lophus/lib/env.ts";

new Relay("wss://relay.nostr.band")
  .subscribe({
    kinds: [1],
    authors: [env.PUBLIC_KEY],
  }, { realtime: false })
  .pipeTo(new EventPublisher(new Relay("wss://nos.lol"), env.PRIVATE_KEY));
