import { Relay } from "../client.ts";
import { pop, push } from "../core/x/streamtools.ts";
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

  beforeEach(() => {
    relay = new Relay("wss://nostr-dev.wellorder.net");
  });

  afterEach(async () => {
    await relay.close();
  });

  it("should not be connected initially", () => {
    assertEquals(relay.status, WebSocket.CLOSED);
  });

  it("should connect when notice stream is opened", async () => {
    const notices = relay.notices;
    assert(notices instanceof ReadableStream);
    await relay.connected;
    assertEquals(relay.status, WebSocket.OPEN);
  });

  it("should connect when message stream is opened", async () => {
    const messages = relay.messages;
    assert(messages instanceof ReadableStream);
    await relay.connected;
    assertEquals(relay.status, WebSocket.OPEN);
  });

  it("should connect when a subscription is created",  async () => {
    const sub = relay.subscribe({ kinds: [1] });
    assert(sub instanceof ReadableStream);
    await relay.connected;
    assertEquals(relay.status, WebSocket.OPEN);
  });

  it("should receive text notes", async () => {
    const sub = relay.subscribe({ kinds: [1] });
    const note = await pop(sub);
    assert(note);
  });

  it("should be able to open multiple subscriptions", () => {
    const metas = relay.subscribe({ kinds: [0] });
    const notes = relay.subscribe({ kinds: [1] });
    assert(metas);
    assert(notes);
  });

  it("should recieve metas and notes simultaneously", async () => {
    const metas = relay.subscribe({ kinds: [0] });
    const notes = relay.subscribe({ kinds: [1] });
    const meta = await pop(metas);
    const note = await pop(notes);
    assert(meta);
    assert(note);
  });
});
