// Recommend relays
import { Relay } from "../../../client.ts";
import { EventPublisher } from "../../../lib/events.ts";
import { env } from "../../../lib/env.ts";

const relay_url = "wss://nostr-dev.wellorder.net";
const relay = new Relay(relay_url);

new EventPublisher(relay, env.PRIVATE_KEY)
  .publish({
    kind: 2,
    content: relay_url,
  })
  .then(relay.close);
