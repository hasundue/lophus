// Publish a text note
import { Relay } from "https://deno.land/x/lophus/client.ts";
import {
  EventKind,
  EventPublisher,
} from "https://deno.land/x/lophus/lib/events.ts";
import { env } from "https://deno.land/x/lophus/lib/env.ts";

const relay = new Relay("wss://nos.lol");

await new EventPublisher(relay, env.PRIVATE_KEY).publish({
  kind: EventKind.TextNote,
  content: "Hello, Nostr! This is Lophus, yet another JS/TS library for Nostr!",
});

await relay.close();
