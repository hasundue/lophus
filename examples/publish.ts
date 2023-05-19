// Publish a text note
import { connect } from "../client.ts";
import { PrivateKey, PublicKey, Signer } from "../lib/signer.ts";
import { TextNoteComposer } from "../lib/agents.ts";

declare const nsec: PrivateKey;
const pubkey = PublicKey.from(nsec);

const event = Signer.sign(
  TextNoteComposer.compose(pubkey, {
    content:
      "Hello, Nostr! This is Lophus, yet another JS/TS library for Nostr!",
  }),
  nsec,
);

await connect({ url: "wss://nos.lol" }).publish(event);
