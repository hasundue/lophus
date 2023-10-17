import { afterAll, beforeAll, describe, it } from "./std/testing.ts";
import { assertEquals, assertInstanceOf } from "./std/assert.ts";
import { pipeThroughFrom } from "./x/streamtools.ts";
import type {} from "../core/protocol.d.ts";
import { Relay } from "../core/relays.ts?nips=1";
import { PrivateKey, Signer } from "./signs.ts";
import { EventInit, EventPublisher } from "./events.ts";
import { MockWebSocket } from "../lib/testing.ts";

describe("EventPublisher", () => {
  let relay: Relay;
  let signer: Signer;
  let publisher: EventPublisher<1>;

  beforeAll(() => {
    globalThis.WebSocket = MockWebSocket;
    signer = new Signer(PrivateKey.generate());
  });
  afterAll(() => {
    relay?.close();
  });

  it("should be a TransformStream", () => {
    publisher = new EventPublisher(signer);
    assertInstanceOf(publisher, TransformStream);
  });

  // FIXME: dangling promise
  it.ignore("should transform EventInit to ClientToRelayMessage", async () => {
    const { readable, writable } = publisher;
    const reader = readable.getReader();
    const writer = writable.getWriter();
    const init = { kind: 1, content: "hello" } satisfies EventInit<1>;
    await writer.write(init);
    const { value } = await reader.read();
    assertEquals(value, ["EVENT", signer.sign(init)]);
    await writer.close();
    await reader.cancel();
  });

  // FIXME: runtime error
  it.ignore("should be connectable to a relay", () => {
    relay = new Relay("wss://example.com");
    const writable = pipeThroughFrom(relay, publisher);
    assertInstanceOf(writable, WritableStream);
  });
});
