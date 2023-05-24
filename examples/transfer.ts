// Transfer your notes from relay to relay
import { Relay } from "../client.ts";
import { env } from "../lib/env.ts";

new Relay({ url: "wss://relay.nostr.band" })
  .subscribe({ kinds: [1], authors: [env.PUBLIC_KEY] })
  .pipeTo(new Relay({ url: "wss://nos.lol" }).publisher);
