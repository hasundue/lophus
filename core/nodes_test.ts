import { NostrNode } from "./nodes.ts";
import {
  afterEach,
  assert,
  assertEquals,
  assertFalse,
  beforeEach,
  describe,
  it,
} from "../lib/std/testing.ts";
import { Server, WebSocket } from "../lib/x/mock-socket.ts";

describe("NostrNode", () => {
  const url = "wss://localhost:8080";
  let server: Server;
  let node: NostrNode;
  let ws: WebSocket;

  beforeEach(() => {
    server = new Server(url);
    node = new NostrNode(() => {
      ws = new WebSocket(url);
      return ws;
    });
  });

  afterEach(async () => {
    await node.close().catch((err) => {
      if (err.message !== "Writable stream is closed or errored.") {
        throw err;
      }
    });
    server.close();
  });

  it("should be able to create a NostrNode instance", () => {
    assert(node);
  });

  it("should not connect to the WebSocket when created", () => {
    assertFalse(ws instanceof WebSocket);
  });

  it("should connect to the WebSocket when a message is sent", async () => {
    await node.getWriter().write(["NOTICE", "test"]);
    assert(ws instanceof WebSocket);
    assertEquals(ws.readyState, WebSocket.OPEN);
  });

  it("should close the WebSocket when the node is closed", async () => {
    await node.getWriter().write(["NOTICE", "test"]);
    await node.close();
    assertEquals(ws.readyState, WebSocket.CLOSED);
  });
});
