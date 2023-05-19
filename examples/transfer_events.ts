import { connect } from "../client.ts";

const relay_src = connect({ url: "wss://relay.nostr.band", write: false });
const relay_dst = connect({ url: "wss://nos.lol", read: false });

relay_src.subscribe({ kinds: [1] }).pipeTo(relay_dst);
