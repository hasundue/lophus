import { Relay } from "../client.ts";
import { ProfileComposer } from "../lib/profiles.ts";
import { Signer } from "../lib/signs.ts";
import { env } from "../lib/env.ts";

new Relay("wss://nos.lol")
  .publish(new Signer(env.PRIVATE_KEY).sign(
    new ProfileComposer(env.PUBLIC_KEY).compose({
      name: "Lophus",
      about:
        "Yet another JS/TS library for Nostr. https://github.com/hasundue/lophus",
    }),
  ));
