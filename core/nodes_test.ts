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

describe("NostrNode", () => {
  let node: NostrNode;
  let ws: WebSocket;

  beforeEach(() => {
    node = new NostrNode(() => {
      ws = new WebSocket("wss://nostr-dev.wellorder.net");
      return ws;
    }, { on: { error: console.error } });
  });

  afterEach(async () => {
    await node.close().catch((err) => {
      if (err.message !== "Writable stream is closed or errored.") {
        throw err;
      }
    });
  });

  it("should be able to create a NostrNode instance", () => {
    assert(node);
  });

  it("should not connect to the WebSocket when created", () => {
    assertFalse(ws instanceof WebSocket);
  });

  it("should create the WebSocket when message stream is requested", () => {
    node.messages;
    assert(ws instanceof WebSocket);
  });

  it("should connect to the WebSocket when a message is sent", async () => {
    await node.send(["NOTICE", "test"]);
    assert(ws instanceof WebSocket);
    assertEquals(ws.readyState, WebSocket.OPEN);
  });

  it("should recieve messages from the WebSocket", async () => {
    const reader = node.messages.getReader();
    ws.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify(["NOTICE", "test"]),
      }),
    );
    const res = await reader.read();
    reader.releaseLock();
    assertEquals(res.value, ["NOTICE", "test"]);
  });

  it("should close the WebSocket when the node is closed", async () => {
    await node.send(["NOTICE", "test"]);
    await node.close();
    assertEquals(ws.readyState, WebSocket.CLOSED);
  });
});
