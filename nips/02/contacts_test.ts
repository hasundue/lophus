import { assertObjectMatch, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { PublicKey, RelayUrl } from "@lophus/core/protocol";
import { parse } from "./contacts.ts";

describe("Contact - parse", () => {
  it("should parse a contact object from a contact tag", () => {
    assertObjectMatch(
      parse([
        "p",
        "abcde..." as PublicKey,
        "wss://localhost:8080" as RelayUrl,
        "Alice",
      ]),
      {
        pubkey: "abcde...",
        relay: "wss://localhost:8080",
        petname: "Alice",
      },
    );
  });

  it("should throw a TypeError if the tag is not a contact", () => {
    assertThrows(
      // @ts-expect-error Expected a contact tag
      () => parse(["t", "nostrdev"]),
    );
  });
});
