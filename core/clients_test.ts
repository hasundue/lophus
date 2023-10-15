import { Client } from "./clients.ts";
import { afterAll, beforeAll, describe, it } from "../lib/std/testing.ts";
import { assert } from "../lib/std/assert.ts";
import { MockWebSocket } from "../lib/testing.ts";

describe("Client", () => {
  let ws: MockWebSocket;
  let client: Client;

  beforeAll(() => {
    ws = new MockWebSocket();
    client = new Client(ws);
  });
  afterAll(() => {
    client.close();
  });

  it("should create a Client instance", () => {
    assert(client instanceof Client);
  });

  it("should return a Map of subscriptions", () => {
    assert(client.subscriptions instanceof Map);
  });
});
