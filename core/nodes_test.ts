import { NostrNode } from "./nodes.ts";
import {
  afterAll,
  assert,
  assertEquals,
  beforeAll,
  describe,
  it,
} from "../lib/std/testing.ts";
import { MockWebSocket } from "../lib/testing.ts";

describe("NostrNode", () => {
  let node: NostrNode;

  beforeAll(() => {
    node = new NostrNode(new MockWebSocket());
  });

  afterAll(async () => {
    await node.close().catch((err) => {
      if (err.message !== "Writable stream is closed or errored.") {
        throw err;
      }
    });
  });

  it("should be able to create a NostrNode instance", () => {
    assert(node instanceof NostrNode);
  });

  it("should be connected to the WebSocket after a message is sent", async () => {
    await node.getWriter().write(["NOTICE", "test"]);
    assertEquals(node.status, WebSocket.OPEN);
  });

  it("should close the WebSocket when the node is closed", async () => {
    await node.getWriter().write(["NOTICE", "test"]);
    await node.close();
    assertEquals(node.status, WebSocket.CLOSED);
  });
});
