import { NostrNode } from "./nodes.ts";
import { pop, push } from "./x/streamtools.ts";
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
    });
  });

  afterEach(async () => {
    await node.close().catch(() => {});
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
    await push(node, ["NOTICE", "test"]);
    assert(ws instanceof WebSocket);
    assertEquals(ws.readyState, WebSocket.OPEN);
  });

  it("should recieve messages from the WebSocket", async () => {
    const msg = pop(node.messages);
    ws.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify(["NOTICE", "test"]),
      }),
    );
    assertEquals(await msg, ["NOTICE", "test"]);
  });

  it("should close the WebSocket when the node is closed", async () => {
    await push(node, ["NOTICE", "test"]);
    await node.close();
    assertEquals(ws.readyState, WebSocket.CLOSED);
  });
});
