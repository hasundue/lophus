// Echo bot
import { connect } from "../client.ts";
import { PrivateKey, PublicKey, Signer } from "../lib/signer.ts";
import { ReplyComposer } from "../lib/agents.ts";

declare const nsec: PrivateKey;
const pubkey = PublicKey.from(nsec);

const relay = connect({ url: "wss://nos.lol" });

const echo = new ReplyComposer(pubkey, (event) => ({ content: event.content }));
const signer = new Signer(nsec);

relay.subscribe({ kinds: [1], "#p": [pubkey] })
  .pipeThrough(echo).pipeThrough(signer).pipeTo(relay);
