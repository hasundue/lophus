// Publish a text note
import { EventKind, Relay } from "../client.ts";
import { EventPublisher } from "../lib/events.ts";
import { env } from "../lib/env.ts";

const relay = new Relay("wss://nos.lol");

new EventPublisher(relay, env.PRIVATE_KEY).publish({
  kind: EventKind.TextNote,
  tags: [],
  content: "Hello, Nostr! This is Lophus, yet another JS/TS library for Nostr!",
}).then(() => relay.close());
