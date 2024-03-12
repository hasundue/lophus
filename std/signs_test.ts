import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { Stringified } from "../lib/types.ts";
import "../nips/01/protocol.ts";
import { Timestamp } from "./times.ts";
import {
  PrivateKey,
  PublicKey,
  Signer,
  UnsignedEvent,
  Verifier,
} from "./signs.ts";

describe("PrivateKey", () => {
  it("generates a private key", () => {
    const nsec = PrivateKey.generate();
    assertEquals(nsec.length, 64);
  });
});

describe("PublicKey", () => {
  it("generates a public key from a private key", () => {
    const nsec = PrivateKey.generate();
    const pubkey = PublicKey.from(nsec);
    assertEquals(pubkey.length, 64);
  });
});

describe("Signer/Verifier", () => {
  const nsec = PrivateKey.generate();
  const signer = new Signer(nsec);
  const event: UnsignedEvent = {
    pubkey: PublicKey.from(nsec),
    created_at: Timestamp.now,
    kind: 1,
    tags: [],
    content: "lophus" as Stringified<string>,
  };
  const verifier = new Verifier();

  it("signs an event", () => {
    const signedEvent = signer.sign(event);
    assert(signedEvent);
  });

  it("verifies a signed event", () => {
    const signedEvent = signer.sign(event);
    assert(verifier.verify(signedEvent));
  });

  it("signs events from a stream", async () => {
    const writer = signer.writable.getWriter();
    writer.write(event);
    writer.close();
    const reader = signer.readable.getReader();
    const result = await reader.read();
    assert(result);
  });
});
