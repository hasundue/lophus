import { Relay, Subscription } from "../client.ts";
import { pop } from "../lib/x/streamtools.ts";
import {
  afterEach,
  assert,
  assertEquals,
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
      assertEquals(relay.config.nbuffer, 10);
      assertEquals(relay.config.read, true);
      assertEquals(relay.config.write, true);
      assertEquals(relay.config.on, {});
    });
  });

  describe("called with url and options", () => {
    beforeAll(() => {
      relay = new Relay("wss://nostr-dev.wellorder.net", {
        name: "test",
        read: false,
        write: false,
        nbuffer: 20,
        on: {
          open: () => {},
          close: () => {},
          error: () => {},
        },
      });
    });

    it("should be constructable", () => {
      assert(relay instanceof Relay);
    });

    it("should have a name", () => {
      assertEquals(relay.config.name, "test");
    });

    it("should have a url", () => {
      assertEquals(relay.config.url, "wss://nostr-dev.wellorder.net");
    });

    it("should have buffer options", () => {
      assertEquals(relay.config.nbuffer, 20);
    });

    it("should have read and write options", () => {
      assertEquals(relay.config.read, false);
      assertEquals(relay.config.write, false);
    });

    it("should have event hooks", () => {
      assertEquals(typeof relay.config.on.open, "function");
      assertEquals(typeof relay.config.on.close, "function");
      assertEquals(typeof relay.config.on.error, "function");
    });
  });
});

describe("Relay", () => {
  let relay: Relay;
  let sub1: Subscription;
  let sub2: Subscription;

  beforeEach(() => {
    relay = new Relay("wss://nostr-dev.wellorder.net", { nbuffer: 2 });
  });

  afterEach(async () => {
    await relay.close();
  });

  it("should not be connected initially", () => {
    assertEquals(relay.status, WebSocket.CLOSED);
  });

  it("should connect when message stream is opened", async () => {
    relay.messages;
    await relay.connected;
    assertEquals(relay.status, WebSocket.OPEN);
  });

  it("should connect when notice stream is opened", async () => {
    relay.notices;
    await relay.connected;
    assertEquals(relay.status, WebSocket.OPEN);
  });

  it("should connect when a subscription is created", async () => {
    sub1 = relay.subscribe({ kinds: [1] });
    await relay.connected;
    assertEquals(relay.status, WebSocket.OPEN);
  });

  it("should receive text notes", async () => {
    sub1 = relay.subscribe({ kinds: [1] });
    assert(await pop(sub1));
  });

  it("should be able to open multiple subscriptions", () => {
    sub1 = relay.subscribe({ kinds: [1], limit: 1 }, { realtime: false });
    sub2 = relay.subscribe({ kinds: [1], limit: 1 }, { realtime: false });
    assert(sub1);
    assert(sub2);
  });

  it("should recieve metas and notes simultaneously", async () => {
    sub1 = relay.subscribe({ kinds: [1], limit: 1 }, { realtime: false });
    sub2 = relay.subscribe({ kinds: [1], limit: 1 }, { realtime: false });
    assert(await pop(sub1));
    assert(await pop(sub2));
  });
});
