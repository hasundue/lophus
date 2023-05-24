// Publish a text note
import { Relay } from "../client.ts";
import { TextNoteComposer } from "../lib/notes.ts";
import { Signer } from "../lib/signs.ts";
import { env } from "../lib/env.ts";

new Relay({ url: "wss://nos.lol" })
  .publish(new Signer(env.PRIVATE_KEY).sign(
    new TextNoteComposer(env.PUBLIC_KEY).compose({
      content:
        "Hello, Nostr! This is Lophus, yet another JS/TS library for Nostr!",
    }),
  ));
