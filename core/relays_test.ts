import { Relay } from "./relays.ts";
import { beforeAll, describe, it } from "../lib/std/testing.ts";
import { assert, assertEquals, assertObjectMatch } from "../lib/std/assert.ts";

const url = "wss://localhost:8080";

describe("Relay", () => {
  let relay: Relay;

  describe("constructed with url only", () => {
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

  describe("constructed with url and options", () => {
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

  it("should not be connected initially", () => {
    relay = new Relay(url);
    assertEquals(relay.status, WebSocket.CLOSED);
  });
});
