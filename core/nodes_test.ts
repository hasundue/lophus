import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { MockWebSocket } from "@lophus/lib/testing";
import { Node } from "./nodes.ts";

describe("NostrNode", () => {
  describe("writable", () => {
    const node = new Node(new MockWebSocket());
    let writer: WritableStreamDefaultWriter;

    it("should open the WebSocket connection", async () => {
      writer = node.writable.getWriter();
      await writer.write(["NOTICE", "test"]);
      writer.releaseLock();
      assertEquals(node.status, WebSocket.OPEN);
    });
  });

  describe("close", () => {
    const node = new Node(new MockWebSocket());

    it("should close the WebSocket connection", async () => {
      await node.close();
      assertEquals(node.status, WebSocket.CLOSED);
    });
  });
});
