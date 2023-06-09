// Recommend relays
import { Relay } from "https://deno.land/x/lophus/client.ts";
import {
  EventKind,
  EventPublisher,
} from "https://deno.land/x/lophus/lib/events.ts";
import { env } from "https://deno.land/x/lophus/lib/env.ts";

const relay_url = "wss://nostr-dev.wellorder.net";
const relay = new Relay(relay_url);

await new EventPublisher(relay, env.PRIVATE_KEY).publish({
  kind: EventKind.RecommendRelay,
  content: relay_url,
});

await relay.close();
