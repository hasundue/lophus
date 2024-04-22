import { assertInstanceOf } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { EventStore } from "./stores.ts";

describe("EventStore", () => {
  describe("constructor", () => {
    it("should create an instance of EventStore", () => {
      const store = new EventStore("test");
      assertInstanceOf(store, EventStore);
    });
  });

  describe("put", () => {
    it("should put an event into the store", async () => {
    });
  });
});
