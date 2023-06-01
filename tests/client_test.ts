import { Relay } from "../client.ts";
import { pop } from "../lib/x/streamtools.ts";
import {
  afterAll,
  afterEach,
  assert,
  assertEquals,
  assertObjectMatch,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "../lib/std/testing.ts";

describe("Relay constructor", () => {
  let relay: Relay;

  describe("called with url only", () => {
    beforeAll(() => {
      relay = new Relay("wss://nostr-dev.wellorder.net");
    });

    it("should be constructable", () => {
      assert(relay instanceof Relay);
    });

    it("should have a url", () => {
      assertEquals(relay.config.url, "wss://nostr-dev.wellorder.net");
    });

    it("should have a name", () => {
      assertEquals(relay.config.name, "nostr-dev.wellorder.net");
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
    const noop = () => {};

    beforeAll(() => {
      relay = new Relay("wss://nostr-dev.wellorder.net", {
        name: "test",
        read: false,
        write: false,
        nbuffer: 20,
        onNotice: noop,
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
        url: "wss://nostr-dev.wellorder.net",
        nbuffer: 20,
        read: false,
        write: false,
        onOpen: noop,
        onClose: noop,
        onError: noop,
        onMessage: noop,
        onNotice: noop,
      });
    });
  });
});

describe("Relay", () => {
  let relay: Relay;

  beforeEach(() => {
    relay = new Relay("wss://nostr-dev.wellorder.net");
  });

  afterEach(async () => {
    await relay.close();
  });

  it("should not be connected initially", () => {
    assertEquals(relay.status, WebSocket.CLOSED);
  });

  it("should connect when message stream is opened", async () => {
    const msgs = relay.messages;
    await relay.connected;
    assertEquals(relay.status, WebSocket.OPEN);
    await msgs.cancel();
  });

  it("should connect when a subscription is created", async () => {
    const sub = relay.subscribe({ kinds: [1] });
    await relay.connected;
    assertEquals(relay.status, WebSocket.OPEN);
    await sub.cancel();
  });

  it("should receive text notes", async () => {
    const sub = relay.subscribe({ kinds: [1] });
    assert(await pop(sub));
    await sub.cancel();
  });

  it("should be able to open multiple subscriptions", async () => {
    const sub1 = relay.subscribe({ kinds: [1], limit: 1 }, { realtime: false });
    const sub2 = relay.subscribe({ kinds: [1], limit: 1 }, { realtime: false });
    assert(sub1);
    assert(sub2);
    await sub1.cancel();
    await sub2.cancel();
  });

  it("should recieve metas and notes simultaneously", async () => {
    const sub1 = relay.subscribe({ kinds: [1], limit: 1 }, { realtime: false });
    const sub2 = relay.subscribe({ kinds: [1], limit: 1 }, { realtime: false });
    assert(await pop(sub1));
    assert(await pop(sub2));
    await sub1.cancel();
    await sub2.cancel();
  });
});
