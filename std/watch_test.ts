import { assertEquals, assertExists, assertInstanceOf } from "@std/assert";
import { beforeAll, describe, it } from "@std/testing/bdd";
import { MockWebSocket } from "@lophus/lib/testing";
import { Relay } from "@lophus/nips/relays";
import { watch } from "./watch.ts";

describe("watch - websockets", () => {
  const ws = new MockWebSocket();

  it("should create a chainable from a websocket", () => {
    const chainable = watch(ws);
    assertExists(chainable.call);
  });

  it("should create a stream of events from multiple websockets", () => {
    const chainable = watch(ws, ws);
    assertExists(chainable.call);
  });

  it("should create a stream of events from a websocket", () => {
    const stream = watch(ws)("message");
    assertInstanceOf(stream, ReadableStream);
  });

  it("should create a stream of events of multiple types from a websocket", () => {
    const stream = watch(ws)("message", "open");
    assertInstanceOf(stream, ReadableStream);
  });

  it("should create a stream of events of multiple types from multiple websockets", () => {
    const stream = watch(ws, ws)("message", "open");
    assertInstanceOf(stream, ReadableStream);
  });

  it("should receive an event from a websocket", async () => {
    const stream = watch(ws)("message");
    const reader = stream.getReader();
    ws.dispatchEvent(new MessageEvent("message", { data: "test" }));
    const { value } = await reader.read();
    assertExists(value);
    assertEquals(value.type, "message");
    assertEquals(value.data, "test");
  });
});

describe("watch - relays", () => {
  let relay: Relay;

  beforeAll(() => {
    relay = new Relay("wss://localhost:8080");
    globalThis.WebSocket = MockWebSocket;
  });

  it("should create a chainable from a relay", () => {
    const chainable = watch(relay);
    assertExists(chainable.call);
  });

  it("should create a chainable from multiple relays", () => {
    const chainable = watch(relay, relay);
    assertExists(chainable.call);
  });

  it("should create a stream of events from a relay", () => {
    const stream = watch(relay)("receive");
    assertInstanceOf(stream, ReadableStream);
  });

  it("should create a stream of events of multiple types from a relay", () => {
    const stream = watch(relay)("receive", "subscribe");
    assertInstanceOf(stream, ReadableStream);
  });

  it("should create a stream of events of multiple types from multiple relays", () => {
    const stream = watch(relay, relay)("receive", "subscribe");
    assertInstanceOf(stream, ReadableStream);
  });

  it("should receive an event from a relay", async () => {
    const stream = watch(relay)("receive");
    const reader = stream.getReader();
    relay.dispatch("receive", ["NOTICE", "test"]);
    const { value } = await reader.read();
    assertExists(value);
    assertEquals(value.type, "receive");
    assertEquals(value.data, ["NOTICE", "test"]);
  });
});
