// Publish a text note
import { EventKind, Relay } from "../client.ts";
import { Publisher } from "../lib/events.ts";
import { env } from "../lib/env.ts";

const relay = new Relay("wss://nos.lol");

new Publisher(relay, env.PRIVATE_KEY).publish({
  kind: EventKind.TextNote,
  tags: [],
  content: "Hello, Nostr! This is Lophus, yet another JS/TS library for Nostr!",
}).then(() => relay.close());
