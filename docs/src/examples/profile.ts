// Publish a metadata (profile) event to the relay.
import { Relay } from "lophus/client.ts";
import { EventPublisher } from "lophus/lib/events.ts";
import { env } from "lophus/lib/env.ts";

const relay = new Relay("wss://nos.lol");

new EventPublisher(relay, env.PRIVATE_KEY)
  .publish({
    kind: 0,
    content: {
      name: "Lophus",
      about:
        "Yet another JS/TS library for Nostr. https://github.com/hasundue/lophus",
      picture: "",
    },
  })
  .then(relay.close);
