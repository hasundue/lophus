import { Client } from "../relay.ts";
import {
  afterAll,
  assert,
  assertEquals,
  assertObjectMatch,
  beforeAll,
  describe,
  it,
} from "../lib/std/testing.ts";
import { MockWebSocket } from "../lib/testing.ts";

describe("Client", () => {
  let ws: MockWebSocket;
  let client: Client;

  beforeAll(() => {
    ws = new MockWebSocket();
    client = new Client(ws, { logger: console });
  });
  afterAll(() => {
    client.close();
  });

  describe("constructor", () => {
    it("should create a Client instance", () => {
      assert(client instanceof Client);
    });
  });

  describe("get events()", () => {
    it("should return a ReadableStream of events", () => {
      assert(client.events instanceof ReadableStream);
    });
  });

  describe("get requests()", () => {
    it("should return a ReadableStream of requests", () => {
      assert(client.requests instanceof ReadableStream);
    });
  });

  describe("subscriptions", () => {
    it("should return a Map of subscriptions", () => {
      assert(client.subscriptions instanceof Map);
    });
  });
});
