// Recommend relays
import { Relay } from "../client.ts";
import { EventKind, EventPublisher } from "../lib/events.ts";
import { env } from "../lib/env.ts";

const relay_url = "wss://nostr-dev.wellorder.net";
const relay = new Relay(relay_url);

new EventPublisher(relay, env.PRIVATE_KEY).publish({
  kind: EventKind.RecommendRelay,
  content: relay_url,
}).then(() => relay.close());
