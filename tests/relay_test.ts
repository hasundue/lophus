import { Client } from "../relay.ts";
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
import { MockWebSocket } from "../lib/testing.ts";

describe("Client", () => {
  describe("constructor", () => {
    let ws: MockWebSocket;
    let client: Client;
    beforeAll(() => {
      ws = new MockWebSocket();
      client = new Client(ws, { logger: { error: console.error } });
    });
    afterAll(async () => {
      await client.close();
      await ws.close();
    });
    it("should create a Client instance", () => {
      assert(client instanceof Client);
    });
  });
});
