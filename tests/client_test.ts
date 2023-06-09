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
    const logger = { info: () => {} };

    beforeAll(() => {
      relay = new Relay("wss://nostr-dev.wellorder.net", {
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
        url: "wss://nostr-dev.wellorder.net",
        nbuffer: 20,
        read: false,
        write: false,
        logger,
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

  it("should not connect when a subscription is created", () => {
    relay.subscribe({ kinds: [1] });
    assertEquals(relay.status, WebSocket.CLOSED);
  });

  it("should receive text notes", async () => {
    const sub = relay.subscribe({ kinds: [1] });
    assert(await pop(sub));
  });

  it("should be able to open multiple subscriptions", () => {
    const sub1 = relay.subscribe({ kinds: [1], limit: 1 }, { realtime: false });
    const sub2 = relay.subscribe({ kinds: [1], limit: 1 }, { realtime: false });
    assert(sub1);
    assert(sub2);
  });

  it("should recieve metas and notes simultaneously", async () => {
    const sub1 = relay.subscribe({ kinds: [1], limit: 1 }, { realtime: false });
    const sub2 = relay.subscribe({ kinds: [1], limit: 1 }, { realtime: false });
    assert(await pop(sub1));
    assert(await pop(sub2));
  });
});
