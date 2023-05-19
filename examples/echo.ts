// Echo bot
import { connect } from "../client.ts";
import { PrivateKey, PublicKey, Signer } from "../lib/signer.ts";
import { ReplyComposer } from "../lib/agents.ts";

declare const nsec: PrivateKey;
const pubkey = PublicKey.from(nsec);

const relay = connect({ url: "wss://nos.lol" });

relay.subscribe({ kinds: [1], "#p": [pubkey] })
  .pipeThrough(
    new ReplyComposer(pubkey, (event) => ({ content: event.content })),
  )
  .pipeThrough(new Signer(nsec))
  .pipeTo(relay);
