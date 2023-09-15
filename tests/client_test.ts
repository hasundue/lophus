import { NostrEvent, Relay } from "../client.ts";
import {
  afterAll,
  assert,
  assertEquals,
  assertObjectMatch,
  beforeAll,
  describe,
  it,
} from "../lib/std/testing.ts";
import { MockWebSocket as WebSocket } from "../lib/testing.ts";

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
      assertEquals(relay.config.name, "localhost:8080");
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

    afterAll(async () => {
      await relay.close();
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
    globalThis.WebSocket = WebSocket;
    relay = new Relay(url);
  });

  afterAll(() => {
    relay.close();
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
    const ws = WebSocket.instances[0];
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
    sub_0 = relay.subscribe({ kinds: [0], limit: 1 }, { id: "test-0" });
    assert(sub_0 instanceof ReadableStream);
  });

  it("should recieve metas and notes simultaneously", async () => {
    const read_0 = sub_0.getReader().read();
    const read_1 = sub_1.getReader().read();
    const ws = WebSocket.instances[0];
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
      read_0,
      read_1,
    ]);
    assert(value_0);
    assertEquals(value_0.kind, 0);
    assert(value_1);
    assertEquals(value_1.kind, 1);
  });
});
