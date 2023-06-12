// Publish a metadata (profile) event to the relay.
import { Relay } from "../../../client.ts";
import { EventPublisher } from "../../../lib/events.ts";
import { env } from "../../../lib/env.ts";

const relay = new Relay("wss://nos.lol");

new EventPublisher(relay, env.PRIVATE_KEY)
  .publish({
    kind: 0,
    content: {
      name: "Lophus",
      about:
        "Yet another JS/TS library for Nostr. https://github.com/hasundue/../../..",
      picture: "",
    },
  })
  .then(relay.close);
