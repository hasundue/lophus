import { assert, assertEquals, assertObjectMatch } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Relay } from "./relays.ts";

describe("Relay", () => {
  const url = "wss://localhost:8080";

  describe("constructed with url only", () => {
    const relay = new Relay(url);

    it("should be constructable", () => {
      assert(relay instanceof Relay);
    });

    it("should have a url", () => {
      assertEquals(relay.config.url, url);
    });

    it("should have a name", () => {
      assertEquals(relay.config.name, "localhost");
    });

    it("should not be connected initially", () => {
      assertEquals(relay.status, WebSocket.CLOSED);
    });
  });

  describe("constructed with url and options", () => {
    const relay = new Relay(url, {
      name: "test",
      nbuffer: 20,
    });

    it("should be constructable", () => {
      assert(relay instanceof Relay);
    });

    it("should have the given options", () => {
      assertObjectMatch(relay.config, {
        name: "test",
        url,
        nbuffer: 20,
      });
    });
  });
});
