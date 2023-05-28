import { assert, assertEquals, describe, it } from "../lib/std/testing.ts";
import { Timestamp } from "../lib/times.ts";
import { PrivateKey, PublicKey, Signer } from "./signs.ts";

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

describe("signEvent", () => {
});

describe("Signer", () => {
  const nsec = PrivateKey.generate();
  const signer = new Signer(nsec);
  const event = {
    pubkey: PublicKey.from(nsec),
    created_at: Timestamp.now,
    kind: 1,
    tags: [],
    content: "lophus",
  };

  it("signs an event", () => {
    const signedEvent = signer.sign(event);
    assert(signedEvent);
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
