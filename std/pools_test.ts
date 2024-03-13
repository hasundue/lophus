import { assertEquals, assertInstanceOf } from "@std/assert";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { MockWebSocket } from "@lophus/lib/testing";
import type { NostrEvent } from "@lophus/core/protocol";
import { Relay } from "@lophus/core/relays";
import { RelayPool } from "./pools.ts";

describe("RelayPool", () => {
  let relays: Relay[];
  let group: RelayPool;
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

  afterAll(() => group.close());

  // ----------------------
  // Constructor
  // ----------------------

  it("should create a group of relays", () => {
    group = new RelayPool(relays);
    assertInstanceOf(group, RelayPool);
  });
  it("should not have a url", () => {
    // @ts-expect-error RelayPool does not have a url
    assertEquals(group.url, undefined);
  });
  it("should have a default name", () => {
    assertEquals(group.config.name, "relay-1, relay-2, relay-3");
  });
  it("should have a custom name if provided", () => {
    const group = new RelayPool(relays, { name: "custom" });
    assertEquals(group.config.name, "custom");
  });
  it("should have default read and write config", () => {
    assertEquals(group.config.read, true);
    assertEquals(group.config.write, true);
  });
  it("should have custom read and write config if provided", () => {
    const group = new RelayPool(relays, { read: false, write: false });
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
