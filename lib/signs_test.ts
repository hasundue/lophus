import { assert, describe, it } from "../lib/std/testing.ts";
import { Timestamp } from "../lib/times.ts";
import { PrivateKey, PublicKey, Signer } from "./signs.ts";

describe("PrivateKey", () => {
  it("generates a private key", () => {
    const nsec = PrivateKey.generate();
    console.debug(nsec);
    assert(nsec);
  });
});

describe("PublicKey", () => {
  it("generates a public key from a private key", () => {
    const nsec = PrivateKey.generate();
    const pubkey = PublicKey.from(nsec);
    console.debug(pubkey);
    assert(pubkey);
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
    console.debug(signedEvent);
    assert(signedEvent);
  });

  it("signs events from a stream", async () => {
    const writer = signer.writable.getWriter();
    writer.write(event);
    writer.close();
    const reader = signer.readable.getReader();
    const result = await reader.read();
    console.debug(result);
    assert(result);
  });
});
