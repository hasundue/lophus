// Transfer events from relay to relay
import { Relay } from "../client.ts";
import { env } from "../lib/env.ts";

new Relay({ url: "wss://relay.nostr.band" })
  .subscribe({ kinds: [1], "#p": [env.PUBLIC_KEY] }).events
  .pipeTo(new Relay({ url: "wss://nos.lol" }).publisher);
