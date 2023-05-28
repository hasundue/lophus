// Publish a metadata (profile) event to the relay.
import { Relay } from "../client.ts";
import { EventKind, EventPublisher } from "../lib/events.ts";
import { env } from "../lib/env.ts";

const relay = new Relay("wss://nos.lol");
const publisher = new EventPublisher(relay, env.PRIVATE_KEY);

publisher.publish({
  kind: EventKind.Metadata,
  content: {
    name: "Lophus",
    about:
      "Yet another JS/TS library for Nostr. https://github.com/hasundue/lophus",
    picture: "",
  },
}).then(() => relay.close());
