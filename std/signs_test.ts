import { assert, assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Stringified } from "@lophus/lib/strings";
import { Timestamp } from "@lophus/lib/times";
import { UnsignedEvent } from "@lophus/core/protocol";
import {
  fromPrivateKey,
  generatePrivateKey,
  Signer,
  Verifier,
} from "./signs.ts";
import { EventContent } from "@lophus/core/protocol";
import { EventKind } from "@lophus/core/protocol";

describe("generatePrivateKey", () => {
  it("generates a private key", () => {
    const nsec = generatePrivateKey();
    assertEquals(nsec.length, 64);
  });
});

describe("fromPrivateKey", () => {
  it("generates a public key from a private key", () => {
    const nsec = generatePrivateKey();
    const pubkey = fromPrivateKey(nsec);
    assertEquals(pubkey.length, 64);
  });
});

type hoge = EventContent<EventKind>;

describe("Signer/Verifier", () => {
  const nsec = generatePrivateKey();
  const signer = new Signer(nsec);
  const event: UnsignedEvent = {
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
