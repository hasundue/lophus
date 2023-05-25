// @ts-nocheck - allow access to protected field
import {
  afterEach,
  assert,
  assertEquals,
  assertFalse,
  beforeEach,
  describe,
  it,
} from "../lib/std/testing.ts";
import { NostrNode } from "./nodes.ts";

describe("NostrNode", () => {
  let node: NostrNode;
  let ws: WebSocket;

  beforeEach(() => {
    node = new NostrNode(
      () => {
        ws = new WebSocket("wss://nostr-dev.wellorder.net");
        return ws;
      },
      { buffer: { high: 10 } },
    );
  });

  afterEach(async () => {
    await node.close();
  });

  it("should be able to create a NostrNode instance", () => {
    assert(node);
  });

  it("should not connect to the WebSocket when created", () => {
    assertFalse(ws instanceof WebSocket);
  });

  it("should be able to create a channel", () => {
    const id = node.channel(new WritableStream());
    assertEquals(typeof id, "string");
    assertEquals(node.channels.length, 1);
  });

  it("should be able to remove a channel", async () => {
    const id = node.channel(new WritableStream());
    assertEquals(node.channels.length, 1);
    await node.unchannel(id);
    assertEquals(node.channels.length, 0);
  });

  it("should connect to the WebSocket when a channel is created", async () => {
    node.channel(new WritableStream());
    await new Promise((resolve) => {
      ws.addEventListener("open", resolve);
    });
    assertEquals(ws.readyState, WebSocket.OPEN);
  });

  it("should be recieve messages from the WebSocket", async () => {
    const msgs: string[] = [];
    node.channel(
      new WritableStream({
        write: (msg) => {
          msgs.push(msg);
        },
      }),
    );
    ws.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify(["NOTICE", "test"]),
      }),
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    assertEquals(msgs[0], ["NOTICE", "test"]);
  });

  it("should be able to send messages to the WebSocket", async () => {
    await node.send(["NOTICE", "test"]);
    await new Promise((resolve) => {
      ws.addEventListener("message", (ev) => {
        const msg = JSON.parse(ev.data);
        // Reply from the server, which could change in the future.
        assertEquals(msg, ["NOTICE", "could not parse command"]);
        resolve();
      });
    });
  });

  it("should connect to the WebSocket when a message is sent", async () => {
    await node.send(["NOTICE", "test"]);
    assertEquals(ws.readyState, WebSocket.OPEN);
  });

  it("should close the WebSocket when the last channel is removed", async () => {
    const id = node.channel(new WritableStream());
    await new Promise((resolve) => {
      ws.addEventListener("open", resolve);
    });
    await node.unchannel(id);
    assertEquals(ws.readyState, WebSocket.CLOSED);
  });

  it("should close the WebSocket when the node is closed", async () => {
    node.channel(new WritableStream());
    await new Promise((resolve) => {
      ws.addEventListener("open", resolve);
    });
    await node.close();
    assertEquals(ws.readyState, WebSocket.CLOSED);
  });
});
