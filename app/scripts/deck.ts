/// <reference lib="dom" />

import type { PublicKey } from "@lophus/nips";

const pubkey: PublicKey = await new Promise((resolve, reject) =>
  self.addEventListener("load", () => {
    if (self.nostr) {
      resolve(self.nostr.getPublicKey());
    }
    return reject("Nostr extension not found");
  })
);

console.log(`[lophus] public key: ${pubkey}`);
