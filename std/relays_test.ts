import {
  assertArrayIncludes,
  assertEquals,
  assertInstanceOf,
} from "@std/assert";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { MockWebSocket } from "@lophus/lib/testing";
import { NostrEvent, Relay, SubscriptionId } from "@lophus/nips";
import { RelayGroup, WithPool } from "./relays.ts";

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

  afterAll(async () => {
    for await (const relay of relays) {
      await relay.close();
    }
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
    sub = group.subscribe({ kinds: [1] }, {
      id: "test-group",
      realtime: false,
    });
    assertInstanceOf(sub, ReadableStream);
  });

  it("should receive messages from all read relays", async () => {
    const messages = Array.fromAsync(sub);
    relays.filter((r) => r.config.read).forEach((relay, i) => {
      relay.dispatch(
        "message",
        // deno-lint-ignore no-explicit-any
        ["EVENT", "test-group", { kind: 1, id: i }] as any,
      );
      relay.dispatch(
        "message",
        ["EOSE", "test-group" as SubscriptionId],
      );
    });
    assertArrayIncludes(await messages, [
      // deno-lint-ignore no-explicit-any
      { kind: 1, id: 0 } as any,
      // deno-lint-ignore no-explicit-any
      { kind: 1, id: 1 } as any,
    ]);
  });

  it("should not close any internal relay when closed", async () => {
    await group.close();
    relays.filter((r) => r.config.read).forEach((relay) => {
      assertEquals(relay.status, WebSocket.OPEN);
    });
  });
});

describe("WithPool", () => {
  let Pooled: WithPool<typeof Relay>;

  beforeAll(() => {
    globalThis.WebSocket = MockWebSocket;
  });

  it("should accept a NIP-enabled relay as an argument", () => {
    Pooled = WithPool(Relay);
  });

  it("should have no relays in the pool initially", () => {
    assertEquals(Pooled.pool.size, 0);
  });

  it("should add a relay to the pool and return it", () => {
    const relay = new Pooled("ws://localhost:80");
    assertEquals(Pooled.pool.size, 1);
    assertEquals(Pooled.pool.has(relay.config.url), true);
  });

  it("should return the pooled relay if it exists", () => {
    const relay = new Pooled("ws://localhost:80");
    assertEquals(Pooled.pool.size, 1);
    assertEquals(Pooled.pool.has(relay.config.url), true);
  });

  it("should remove a relay from the pool when it is closed", async () => {
    const relay = new Pooled("ws://localhost:80");
    await relay.close();
    assertEquals(Pooled.pool.size, 0);
  });
});
