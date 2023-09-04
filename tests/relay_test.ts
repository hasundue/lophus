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
  describe("new Client()", () => {
    let ws: WebSocket;
    let client: Client;
    beforeAll(() => {
      ws = new MockWebSocket();
      client = new Client(ws, { logger: { error: console.error } });
    });
    afterAll(async () => {
      await client.close();
      ws.close();
      // wait for 1 second to allow the server to close the connection.
    });
    it("should create a Client instance", () => {
      assert(client instanceof Client);
    });
  });
});
