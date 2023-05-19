import { connect } from "../client.ts";
import { PrivateKey, PublicKey, signEvent } from "../lib/signer.ts";
import { Timestamp } from "../lib/time.ts";

declare const nsec: PrivateKey;
const pubkey = PublicKey.from(nsec);

const relay = connect({ url: "wss://nos.lol" });

const event = signEvent({
  pubkey,
  created_at: Timestamp.now,
  kind: 1,
  tags: [],
  content:
    `Hello, Nostr! This is Lophus, yet another JS/TS library for the protocol.
https://github.com/hasundue/lophus`,
}, nsec);

await relay.publish(event);
