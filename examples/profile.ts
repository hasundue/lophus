// Publish a metadata (profile) event to the relay.
import { Relay } from "../client.ts";
import { EventKind, EventPublisher } from "../lib/events.ts";
import { env } from "../lib/env.ts";

const relay = new Relay("wss://nostr-dev.wellorder.net");

await new EventPublisher(relay, env.PRIVATE_KEY).publish({
  kind: EventKind.Metadata,
  content: JSON.stringify({
    name: "Lophus",
    about:
      "Yet another JS/TS library for Nostr. https://github.com/hasundue/lophus",
    picture: "",
  }),
});

await relay.notices.pipeThrough(new TextEncoderStream()).pipeTo(Deno.stdout.writable);
