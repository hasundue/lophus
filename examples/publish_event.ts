import { connect } from "../client.ts";
import { signEvent } from "../nips/01.ts";

const relay = connect({ url: "wss://nos.lol" });

const event = signEvent({
  pubkey: MY_PUBKEY,
  created_at: Date.now() / 1000,
  kind: 1,
  tags: [],
  content: "Hello, Nostr!",
}, MY_PRIVKEY);

const events = relay.subscribe({ kinds: [1] });
