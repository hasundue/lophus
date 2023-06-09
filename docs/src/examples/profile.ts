// Publish a metadata (profile) event to the relay.
import { Relay } from "lophus/client.ts";
import { EventKind, EventPublisher } from "lophus/lib/events.ts";
import { env } from "lophus/lib/env.ts";

const relay = new Relay("wss://nos.lol");

await new EventPublisher(relay, env.PRIVATE_KEY).publish({
  kind: EventKind.Metadata,
  content: JSON.stringify({
    name: "Lophus",
    about:
      "Yet another JS/TS library for Nostr. https://github.com/hasundue/lophus",
    picture: "",
  }),
});

await relay.close();
