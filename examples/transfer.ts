// Transfer events from relay to relay
import { connect, PublicKey } from "../client.ts";

declare const pubkey: PublicKey;

const relay_src = connect({ url: "wss://relay.nostr.band", write: false });
const relay_dst = connect({ url: "wss://nos.lol", read: false });

relay_src.subscribe({ kinds: [1], "#p": [pubkey] }).pipeTo(relay_dst);
