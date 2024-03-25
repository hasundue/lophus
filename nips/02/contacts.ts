import { ContactTag, PublicKey, RelayUrl } from "@lophus/core/protocol";
import "./protocol.ts";

export interface Contact {
  pubkey: PublicKey;
  relay: RelayUrl;
  petname: string;
}

export function parse(tag: ContactTag): Contact {
  if (tag[0] !== "p") {
    throw new TypeError("Expected a contact tag", { cause: tag });
  }
  return {
    pubkey: tag[1],
    relay: tag[2],
    petname: tag[3],
  };
}
