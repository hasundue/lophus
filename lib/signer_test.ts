import { assert, describe, it } from "../lib/std/testing.ts";
import { Timestamp } from "../lib/timestamp.ts";
import { PrivateKey, PublicKey, Signer, signEvent } from "./signer.ts";

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
  it("signs an event", () => {
    const nsec = PrivateKey.generate();
    const pubkey = PublicKey.from(nsec);
    const event = {
      pubkey: pubkey,
      created_at: Timestamp.now,
      kind: 1,
      tags: [],
      content: "lophus",
    };
    const signedEvent = signEvent(event, nsec);
    console.debug(signedEvent);
    assert(signedEvent);
  });
});

describe("Signer", () => {
  it("signs an event", async () => {
    const nsec = PrivateKey.generate();
    const pubkey = PublicKey.from(nsec);
    const event = {
      pubkey: pubkey,
      created_at: Timestamp.now,
      kind: 1,
      tags: [],
      content: "lophus",
    };
    const signer = new Signer(nsec);
    const writer = signer.writable.getWriter();
    writer.write(event);
    writer.close();
    const reader = signer.readable.getReader();
    const result = await reader.read();
    console.debug(result);
    assert(result);
  });
});
