import { assert, assertEquals, assertObjectMatch } from "@std/assert";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { Relay } from "./relays.ts";

const url = "wss://localhost:8080";

describe("Relay", () => {
  let relay: Relay;

  describe("constructed with url only", () => {
    beforeAll(() => {
      relay = new Relay(url);
    });

    afterAll(() => relay.close());

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
        read: true,
        write: true,
      });
    });

    it("should not be connected initially", () => {
      assertEquals(relay.status, WebSocket.CLOSED);
    });
  });

  describe("constructed with url and options", () => {
    beforeAll(() => {
      relay = new Relay(url, {
        name: "test",
        read: false,
        write: false,
        nbuffer: 20,
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
      });
    });
  });
});
