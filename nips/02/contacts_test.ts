import { describe, it } from "@std/testing/bdd";
import { PublicKey, RelayUrl } from "@lophus/core/protocol";
import { parse } from "./contacts.ts";
import { assertObjectMatch } from "@std/assert";

describe("Contact - parse", () => {
  it("should parse a contact object from a contact tag", () => {
    assertObjectMatch(
      parse([
        "p",
        "npub..." as PublicKey,
        "wss://localhost:8080" as RelayUrl,
        "Alice",
      ]),
      {
        pubkey: "npub...",
        relay: "wss://localhost:8080",
        petname: "Alice",
      },
    );
  });
});
