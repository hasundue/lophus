import { connect } from "../client.ts";
import { PublicKey } from "../types.ts";

declare const pubkey: PublicKey;

const relay_src = connect({ url: "wss://relay.nostr.band", write: false });
const relay_dst = connect({ url: "wss://nos.lol", read: false });

relay_src.subscribe({ kinds: [1], "#p": [pubkey] }).pipeTo(relay_dst);
