import { afterAll, beforeAll, describe, it } from "../lib/std/testing.ts";
import { assertEquals, assertInstanceOf } from "../lib/std/assert.ts";
import { NostrEvent } from "../core/protocol.d.ts";
import { Relay } from "../core/relays.ts?nips=1";
import { RelayGroup } from "../lib/relays.ts";
import { MockWebSocket } from "../lib/testing.ts";

describe("RelayGroup", () => {
  let relays: Relay[];
  let group: RelayGroup;
  let sub: ReadableStream<NostrEvent>;

  // ----------------------
  // Setup
  // ----------------------
  beforeAll(() => {
    globalThis.WebSocket = MockWebSocket;
    relays = [
      new Relay("ws://localhost:80", {
        name: "relay-1",
        read: true,
        write: true,
      }),
      new Relay("ws://localhost:81", {
        name: "relay-2",
        read: true,
        write: false,
      }),
      new Relay("ws://localhost:82", {
        name: "relay-3",
        read: false,
        write: true,
      }),
    ];
  });
  afterAll(() => {
    group.close();
  });

  // ----------------------
  // Constructor
  // ----------------------
  it("should create a group of relays", () => {
    group = new RelayGroup(relays);
    assertInstanceOf(group, RelayGroup);
  });
  it("should not have a url", () => {
    // @ts-expect-error RelayGroup does not have a url
    assertEquals(group.url, undefined);
  });
  it("should have a default name", () => {
    assertEquals(group.config.name, "relay-1, relay-2, relay-3");
  });
  it("should have a custom name if provided", () => {
    const group = new RelayGroup(relays, { name: "custom" });
    assertEquals(group.config.name, "custom");
  });
  it("should have default read and write config", () => {
    assertEquals(group.config.read, true);
    assertEquals(group.config.write, true);
  });
  it("should have custom read and write config if provided", () => {
    const group = new RelayGroup(relays, { read: false, write: false });
    assertEquals(group.config.read, false);
    assertEquals(group.config.write, false);
  });

  // ----------------------
  // Subscription
  // ----------------------
  it("should create a subscription", () => {
    sub = group.subscribe({ kinds: [1] }, { id: "test-group" });
    assertInstanceOf(sub, ReadableStream);
  });
});