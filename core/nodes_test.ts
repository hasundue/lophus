import { assertEquals } from "@std/assert";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { MockWebSocket } from "@lophus/lib/testing";
import { NostrNode, NostrNodeBase } from "./nodes.ts";

describe("NostrNodeBase", () => {
  let node: NostrNode;
  let writer: WritableStreamDefaultWriter;

  beforeAll(() => {
    node = new NostrNodeBase(new MockWebSocket());
  });

  afterAll(async () => {
    await node.close().catch((err) => {
      if (err.message !== "Writable stream is closed or errored.") {
        throw err;
      }
    });
  });

  it("should be connected to the WebSocket after a message is sent", async () => {
    writer = node.writable.getWriter();
    await writer.write(["NOTICE", "test"]);
    writer.releaseLock();
    assertEquals(node.status, WebSocket.OPEN);
  });

  it("should close the WebSocket when the node is closed", async () => {
    await node.close();
    assertEquals(node.status, WebSocket.CLOSED);
  });
});
