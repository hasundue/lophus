import { assert } from "@std/assert";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { MockWebSocket } from "../lib/testing.ts";
import { Client } from "./clients.ts";

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
