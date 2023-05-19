import { connect } from "../client.ts";

const relay_src = connect({ url: "wss://relay.nostr.band", read: true });
const relay_dst = connect({ url: "wss://nos.lol" });

relay_src.subscribe({ kinds: [1] }).pipeTo(relay_dst);
