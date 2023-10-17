import "./protocol.d.ts";
import { afterAll, beforeAll, describe, it } from "../../lib/std/testing.ts";
import {
  assert,
  assertEquals,
  assertInstanceOf,
} from "../../lib/std/assert.ts";
import { MockWebSocket } from "../../lib/testing.ts";
import {
  ClientToRelayMessage,
  EventId,
  NostrEvent,
  RelayToClientMessage,
} from "../../core/protocol.d.ts";
import { ConnectionClosed, Relay } from "../../core/relays.ts?nips=1";

describe("NIP-01/Relay", () => {
  const url = "wss://localhost:8080";
  let relay: Relay;
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

  it("should have loaded NIP-01 module", () => {
    assertEquals(relay.config.modules.length, 1);
  });
  it("should not connect when a subscription is created", () => {
    sub_1 = relay.subscribe({ kinds: [1] }, { id: "test-1" });
    assert(sub_1 instanceof ReadableStream);
    assertEquals(relay.status, WebSocket.CLOSED);
  });
  it("should receive text notes", async () => {
    const reader = sub_1.getReader();
    const read = reader.read();
    const ws = MockWebSocket.instances[0];
    ws.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify(["EVENT", "test-1", { kind: 1 }]),
      }),
    );
    const { value, done } = await read;
    assert(!done);
    assertEquals(value.kind, 1);
    reader.releaseLock();
  });
  it("should be able to open multiple subscriptions", () => {
    sub_0 = relay.subscribe({ kinds: [0], limit: 1 }, {
      id: "test-0",
    });
    assert(sub_0 instanceof ReadableStream);
  });
  it("should recieve metas and notes simultaneously", async () => {
    const reader_0 = sub_0.getReader();
    const reader_1 = sub_1.getReader();
    const ws = MockWebSocket.instances[0];
    ws.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify(["EVENT", "test-0", { kind: 0 }]),
      }),
    );
    ws.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify(["EVENT", "test-1", { kind: 1 }]),
      }),
    );
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
  it("should publish an event and recieve an accepting OK message", async () => {
    const eid = "test-true" as EventId;
    const ok = ["OK", eid, true, ""] satisfies RelayToClientMessage<"OK">;
    const ws = MockWebSocket.instances[0];
    const arrived = new Promise<true>((resolve) => {
      ws.remote.addEventListener(
        "message",
        (ev: MessageEvent<string>) => {
          // deno-fmt-ignore
          const [, event] = JSON.parse(ev.data) as ClientToRelayMessage<"EVENT">;
          if (event.id === eid) {
            assertEquals(event.kind, 1);
            resolve(true);
            ws.remote.send(JSON.stringify(ok));
          }
        },
      );
    });
    const event = { id: eid, kind: 1 };
    // deno-lint-ignore no-explicit-any
    await relay.publish(event as any);
    assert(await arrived);
  });
  it("should receieve a rejecting OK message and throw EventRejected", async () => {
    const eid = "test-false" as EventId;
    // deno-fmt-ignore
    const msg = ["OK", eid, false, "error: test"] satisfies RelayToClientMessage<"OK">
    const ws = MockWebSocket.instances[0];
    const arrived = new Promise<true>((resolve) => {
      ws.remote.addEventListener(
        "message",
        (ev: MessageEvent<string>) => {
          // deno-fmt-ignore
          const [, event] = JSON.parse(ev.data) as ClientToRelayMessage<"EVENT">;
          if (event.id === eid) {
            assertEquals(event.kind, 1);
            resolve(true);
            ws.remote.send(JSON.stringify(msg));
          }
        },
      );
    });
    const event = { id: eid, kind: 1 };
    // deno-lint-ignore no-explicit-any
    const result: unknown = await relay.publish(event as any).catch((e) => e);
    // FIXME: This should be an EventRejected instance.
    assertInstanceOf(result, Error);
    assertEquals(result.message, "error: test");
    assertEquals(result.cause, event);
    await arrived;
  });
  it("should throw ConnectionClosed when connection is closed before recieving an OK message", async () => {
    const event = { id: "test-close" as EventId, kind: 1 };
    // deno-lint-ignore no-explicit-any
    const published = relay.publish(event as any).catch((e) => e);
    MockWebSocket.instances[0].remote.close();
    assertInstanceOf(await published, ConnectionClosed);
  });
});
