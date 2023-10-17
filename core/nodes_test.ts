import { NostrNode } from "./nodes.ts";
import { afterAll, beforeAll, describe, it } from "../lib/std/testing.ts";
import { assert, assertEquals } from "../lib/std/assert.ts";
import { MockWebSocket } from "../lib/testing.ts";

describe("NostrNode", () => {
  let node: NostrNode;
  let writer: WritableStreamDefaultWriter;

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
    writer = node.getWriter();
    await writer.write(["NOTICE", "test"]);
    writer.releaseLock();
    assertEquals(node.status, WebSocket.OPEN);
  });

  it("should close the WebSocket when the node is closed", async () => {
    await node.close();
    assertEquals(node.status, WebSocket.CLOSED);
  });
});
