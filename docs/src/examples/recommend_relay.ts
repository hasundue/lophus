// Recommend relays
import { Relay } from "lophus/client.ts";
import { EventKind, EventPublisher } from "lophus/lib/events.ts";
import { env } from "lophus/lib/env.ts";

const relay_url = "wss://nostr-dev.wellorder.net";
const relay = new Relay(relay_url);

await new EventPublisher(relay, env.PRIVATE_KEY).publish({
  kind: EventKind.RecommendRelay,
  content: relay_url,
});

await relay.close();
