import { assert, assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { DAY, HOUR, MINUTE, SECOND, Timestamp } from "./times.ts";

describe("Duration", () => {
  describe("DAY", () => {
    it("should be 86400", () => {
      assertEquals(DAY, 86400);
    });
  });
  describe("HOUR", () => {
    it("should be 3600", () => {
      assertEquals(HOUR, 3600);
    });
  });
  describe("MINUTE", () => {
    it("should be 60", () => {
      assertEquals(MINUTE, 60);
    });
  });
  describe("SECOND", () => {
    it("should be 1", () => {
      assertEquals(SECOND, 1);
    });
  });
});

describe("Timestamp", () => {
  describe("now", () => {
    it("should return a ten-digit number", () => {
      assertEquals(Timestamp.now.toString().length, 10);
    });
  });
  describe("past", () => {
    it("should return a ten-digit number", () => {
      assertEquals(Timestamp.past(MINUTE).toString().length, 10);
    });
    it("should be smaller than now", () => {
      assert(Timestamp.past(MINUTE) < Timestamp.now);
    });
  });
  describe("future", () => {
    it("should return a ten-digit number", () => {
      assertEquals(Timestamp.future(MINUTE).toString().length, 10);
    });
    it("should be greater than now", () => {
      assert(Timestamp.future(MINUTE) > Timestamp.now);
    });
  });
});
