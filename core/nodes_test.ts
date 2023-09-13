import { NostrNode } from "./nodes.ts";
import {
  afterAll,
  assert,
  assertEquals,
  beforeAll,
  describe,
  it,
} from "../lib/std/testing.ts";
import { Server, WebSocket } from "../lib/x/mock-socket.ts";

describe("NostrNode", () => {
  const url = "wss://localhost:8080";
  let server: Server;
  let node: NostrNode;

  beforeAll(() => {
    server = new Server(url);
    node = new NostrNode(url);
  });

  afterAll(async () => {
    await node.close().catch((err) => {
      if (err.message !== "Writable stream is closed or errored.") {
        throw err;
      }
    });
    server.close();
  });

  it("should be able to create a NostrNode instance", () => {
    assert(node instanceof NostrNode);
  });

  it("should not connect to the WebSocket when created", () => {
    assertEquals(node.status, WebSocket.CLOSED);
  });

  it("should connect to the WebSocket when a message is sent", async () => {
    await node.getWriter().write(["NOTICE", "test"]);
    assertEquals(node.status, WebSocket.OPEN);
  });

  it("should close the WebSocket when the node is closed", async () => {
    await node.getWriter().write(["NOTICE", "test"]);
    await node.close();
    assertEquals(node.status, WebSocket.CLOSED);
  });
});
