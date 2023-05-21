// Publish a text note
import { Relay } from "../client.ts";
import { env } from "../lib/env.ts";
import { TextNoteComposer } from "../lib/agents.ts";
import { Signer } from "../lib/signer.ts";

const relay = new Relay({ url: "wss://nos.lol" });

const event = Signer.sign(
  TextNoteComposer.compose(env.PUBLIC_KEY, {
    content:
      "Hello, Nostr! This is Lophus, yet another JS/TS library for Nostr!",
  }),
  env.PRIVATE_KEY,
);

await relay.publish(event);
