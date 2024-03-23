import { assert, assertEquals, assertInstanceOf } from "@std/assert";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { MockWebSocket } from "@lophus/lib/testing";
import type {
  ClientToRelayMessage,
  EventId,
  NostrEvent,
  RelayToClientMessage,
  SubscriptionId,
} from "@lophus/core/protocol";
import {
  ConnectionClosed,
  EventRejected,
  SubscriptionClosed,
} from "@lophus/core/relays";
import { Relay } from "../relays.ts";

async function getRemoteSocket() {
  const { value } = await MockWebSocket.instances().next();
  return value!.remote;
}

describe("Relay (NIP-01)", () => {
  const url = "wss://localhost:8080";
  let relay: Relay;
  let remote: MockWebSocket;
  let sub_0: ReadableStream<NostrEvent<0>>;
  let sub_1: ReadableStream<NostrEvent<1>>;

  beforeAll(() => {
    globalThis.WebSocket = MockWebSocket;
    relay = new Relay(url);
  });

  afterAll(() => {
    if (relay.status === WebSocket.OPEN) {
      return relay.close();
    }
  });

  it("should not have any nips configured", () => {
    assertEquals(relay.config.nips.length, 0);
  });

  it("should create a subscription", () => {
    sub_1 = relay.subscribe({ kinds: [1] }, { id: "test-1" });
    assertInstanceOf(sub_1, ReadableStream);
  });

  it("should receive text notes", async () => {
    const reader = sub_1.getReader();
    remote = await getRemoteSocket();
    remote.send(JSON.stringify(["EVENT", "test-1", { kind: 1 }]));
    const { value, done } = await reader.read();
    assert(!done);
    assertEquals(value.kind, 1);
    reader.releaseLock();
  });

  it("should be able to open multiple subscriptions", () => {
    sub_0 = relay.subscribe({ kinds: [0] }, { id: "test-0" });
    assert(sub_0 instanceof ReadableStream);
  });

  it("should recieve metas and notes simultaneously", async () => {
    const reader_0 = sub_0.getReader();
    const reader_1 = sub_1.getReader();
    remote.send(JSON.stringify(["EVENT", "test-0", { kind: 0 }]));
    remote.send(JSON.stringify(["EVENT", "test-1", { kind: 1 }]));
    const [{ value: value_0 }, { value: value_1 }] = await Promise.all([
      reader_0.read(),
      reader_1.read(),
    ]);
    assert(value_0);
    assertEquals(value_0.kind, 0);
    assert(value_1);
    assertEquals(value_1.kind, 1);
    reader_0.releaseLock();
    reader_1.releaseLock();
  });

  it("should close a subscription with an error when receiving a CLOSED message", async () => {
    remote.send(JSON.stringify(
      [
        "CLOSED",
        "test-1" as SubscriptionId,
        "error: test",
      ] satisfies RelayToClientMessage<"CLOSED">,
    ));
    const reader = sub_1.getReader();
    try {
      await reader.read();
    } catch (e) {
      assertInstanceOf(e, SubscriptionClosed);
      assertEquals(e.message, "error: test");
    } finally {
      reader.releaseLock();
    }
  });

  it("should reconnect if connection is closed while waiting for an event", async () => {
    const reader = sub_0.getReader();
    const read = reader.read(); // wait for an event
    remote.close();
    const reconnected = new Promise<true>((resolve) => {
      relay.ws.addEventListener("open", () => resolve(true));
    });
    assert(await reconnected);
    // We must use a new instance of MockWebSocket.
    remote = await getRemoteSocket();
    remote.send(JSON.stringify(["EVENT", "test-0", { kind: 0 }]));
    const { value, done } = await read;
    assert(!done);
    assertEquals(value.kind, 0);
    reader.releaseLock();
  });

  it("should publish an event and recieve an accepting OK message", async () => {
    const eid = "test-true" as EventId;
    const arrived = new Promise<true>((resolve) => {
      remote.addEventListener(
        "message",
        (ev: MessageEvent<string>) => {
          // deno-fmt-ignore
          const [, event] = JSON.parse(ev.data) as ClientToRelayMessage<"EVENT">;
          if (event.id === eid) {
            assertEquals(event.kind, 1);
            remote.send(
              JSON.stringify(
                ["OK", eid, true, ""] satisfies RelayToClientMessage<"OK">,
              ),
            );
            resolve(true);
          }
        },
      );
    });
    // deno-lint-ignore no-explicit-any
    await relay.publish({ id: eid, kind: 1 } as any);
    assert(await arrived);
  });

  it("should receieve a rejecting OK message and throw EventRejected", async () => {
    const eid = "test-false" as EventId;
    // deno-fmt-ignore
    const msg = ["OK", eid, false, "error: test"] satisfies RelayToClientMessage<"OK">
    const arrived = new Promise<true>((resolve) => {
      remote.addEventListener(
        "message",
        (ev: MessageEvent<string>) => {
          // deno-fmt-ignore
          const [, event] = JSON.parse(ev.data) as ClientToRelayMessage<"EVENT">;
          if (event.id === eid) {
            assertEquals(event.kind, 1);
            resolve(true);
            remote.send(JSON.stringify(msg));
          }
        },
      );
    });
    const event = { id: eid, kind: 1 };
    try {
      // deno-lint-ignore no-explicit-any
      await relay.publish(event as any).catch((e) => e);
    } catch (err) {
      assertInstanceOf(err, EventRejected);
      assertEquals(err.message, "error: test");
      assertEquals(err.cause, event);
    }
    await arrived;
  });

  it("should throw ConnectionClosed when connection is closed before recieving an OK message", async () => {
    const event = { id: "test-close" as EventId, kind: 1 };
    // deno-lint-ignore no-explicit-any
    const published = relay.publish(event as any).catch((e) => e);
    remote.close();
    try {
      await published;
    } catch (e) {
      assertInstanceOf(e, ConnectionClosed);
    }
  });
});
