import {
  ClientToRelayMessage,
  EventId,
  NostrEvent,
  RelayToClientMessage,
} from "./protocol.ts";
import "../nips/01/protocol.ts";
import { EventRejected, Relay, RelayClosed } from "./relays.ts";
import { afterAll, beforeAll, describe, it } from "../lib/std/testing.ts";
import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertObjectMatch,
} from "../lib/std/assert.ts";
import { MockWebSocket } from "../lib/testing.ts";

const url = "wss://localhost:8080";

describe("Relay constructor", () => {
  let relay: Relay;

  describe("called with url only", () => {
    beforeAll(() => {
      relay = new Relay(url);
    });
    it("should be constructable", () => {
      assert(relay instanceof Relay);
    });
    it("should have a url", () => {
      assertEquals(relay.config.url, url);
    });
    it("should have a name", () => {
      assertEquals(relay.config.name, "localhost");
    });
    it("should have default options", () => {
      assertObjectMatch(relay.config, {
        nbuffer: 10,
        read: true,
        write: true,
      });
    });
  });

  describe("called with url and options", () => {
    const logger = { info: () => {} };
    beforeAll(() => {
      relay = new Relay(url, {
        name: "test",
        read: false,
        write: false,
        nbuffer: 20,
        logger,
      });
    });
    afterAll(() => {
      relay.close();
    });
    it("should be constructable", () => {
      assert(relay instanceof Relay);
    });
    it("should have the given options", () => {
      assertObjectMatch(relay.config, {
        name: "test",
        url,
        nbuffer: 20,
        read: false,
        write: false,
        logger,
      });
    });
  });
});

describe("Relay", () => {
  const url = "wss://localhost:8080";
  let relay: Relay;
  let sub_0: ReadableStream<NostrEvent<0>>;
  let sub_1: ReadableStream<NostrEvent<1>>;

  beforeAll(() => {
    globalThis.WebSocket = MockWebSocket;
    relay = new Relay(url);
  });
  afterAll(async () => {
    if (relay.status === WebSocket.OPEN) {
      await relay.close();
    }
  });

  it("should not be connected initially", () => {
    assertEquals(relay.status, WebSocket.CLOSED);
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
    assertInstanceOf(
      // deno-lint-ignore no-explicit-any
      await relay.publish(event as any).catch((e) => e),
      EventRejected,
    );
    await arrived;
  });
  it("should throw RelayClosed when relay is closed before recieving an OK message", async () => {
    const event = { id: "test-close" as EventId, kind: 1 };
    // deno-lint-ignore no-explicit-any
    const published = relay.publish(event as any).catch((e) => e);
    await relay.close();
    assertInstanceOf(await published, RelayClosed);
  });
});
