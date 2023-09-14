import {
  assert,
  assertEquals,
  beforeAll,
  afterAll,
  describe,
  it,
} from "../lib/std/testing.ts";
import { MockWebSocket } from "../lib/testing.ts";

describe("MockWebSocket", () => {
  it("should be able to create a MockWebSocket instance", () => {
    const ws = new MockWebSocket();
    assert(ws instanceof MockWebSocket);
  });
  it("should be able to send a message", () => {
    const ws = new MockWebSocket();
    ws.send("test");
    // assertEquals(ws.sent, ["test"]);
  });
});
