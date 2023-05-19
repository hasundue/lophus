// Echo bot
import { connect, DefaultAgent } from "../client.ts";
import { PrivateKey, PublicKey, Signer } from "../lib/signer.ts";
import { Timestamp } from "../lib/time.ts";

declare const nsec: PrivateKey;
const pubkey = PublicKey.from(nsec);

const relay = connect({ url: "wss://nos.lol" });

const echo = new DefaultAgent({
  transform: (event, controller) => {
    controller.enqueue({
      pubkey,
      created_at: Timestamp.now,
      kind: 1,
      tags: [
        ["e", event.id, relay.url],
        ["p", event.pubkey, relay.url],
      ],
      content: event.content,
    });
  },
});
const signer = new Signer(nsec);

relay.subscribe({ kinds: [1], "#p": [pubkey] })
  .pipeThrough(echo).pipeThrough(signer).pipeTo(relay);
