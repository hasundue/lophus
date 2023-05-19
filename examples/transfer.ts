// Transfer events from relay to relay
import { connect } from "../client.ts";
import { env } from "../lib/env.ts";

const relay_src = connect({ url: "wss://relay.nostr.band", write: false });
const relay_dst = connect({ url: "wss://nos.lol", read: false });

relay_src.subscribe({ kinds: [1], "#p": [env.PUBLIC_KEY] }).pipeTo(relay_dst);
