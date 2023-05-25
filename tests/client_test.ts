import { Relay } from "../client.ts";
import { DualMarkStreamWatermarks } from "../core/streams.ts";
import {
  assert,
  assertEquals,
  assertObjectMatch,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "../lib/std/testing.ts";

describe("Relay", () => {
  let relay: Relay;

  describe("constructed with url", () => {
    beforeAll(() => {
      relay = new Relay("wss://nostr-dev.wellorder.net");
    });

    it("should be constructable", () => {
      assert(relay instanceof Relay);
    });

    it("should have a url", () => {
      assertEquals(relay.url, "wss://nostr-dev.wellorder.net");
    });

    it("should have a name", () => {
      assertEquals(relay.config.name, "nostr-dev.wellorder.net");
    });

    it("should have default options", () => {
      assertObjectMatch(
        relay.config.buffer,
        DualMarkStreamWatermarks.default({ high: 20 }),
      );
      assertEquals(relay.config.read, true);
      assertEquals(relay.config.write, true);
      assertEquals(relay.config.on, {});
    });

    it("should not have event hooks", () => {
      assertObjectMatch(relay.config.on, {});
    });
  });

  describe("constructed with url and options", () => {
    beforeAll(() => {
      relay = new Relay("wss://nostr-dev.wellorder.net", {
        name: "test",
        buffer: { high: 10 },
        read: false,
        write: false,
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
      assertEquals(relay.url, "wss://nostr-dev.wellorder.net");
    });

    it("should have buffer options", () => {
      assertObjectMatch(
        relay.config.buffer,
        DualMarkStreamWatermarks.default({ high: 10 }),
      );
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
