// Publish a text note
import { Relay } from "../../../client.ts";
import { EventKind, EventPublisher } from "../../../lib/events.ts";
import { env } from "../../../lib/env.ts";

const relay = new Relay("wss://nos.lol");

new EventPublisher(relay, env.PRIVATE_KEY)
  .publish({
    kind: EventKind.TextNote,
    content:
      "Hello, Nostr! This is Lophus, yet another JS/TS library for Nostr!",
  })
  .then(relay.close);
