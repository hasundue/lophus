import {
  afterEach,
  assert,
  assertEquals,
  beforeEach,
  describe,
  it,
} from "../lib/std/testing.ts";
import { LazyWebSocket } from "./websockets.ts";

describe("LazyWebSocket", () => {
  let ws: WebSocket;
  let lazy: LazyWebSocket;

  beforeEach(() => {
    lazy = new LazyWebSocket(() => {
      ws = new WebSocket("wss://nostr-dev.wellorder.net");
      return ws;
    });
  });

  afterEach(async () => {
    await lazy.close();
  });

  it("should be able to create a LazyWebSocket instance", () => {
    assert(lazy);
  });

  it("should not create a WebSocket until it is needed", () => {
    assert(ws === undefined);
  });

  it("should not create a WebSocket when an event listener is added", () => {
    lazy.addEventListener("open", () => {});
    assert(ws === undefined);
  });

  it("should create a WebSocket when the ready property is accessed", async () => {
    await lazy.ready;
    assert(ws instanceof WebSocket);
  });

  it("should create a WebSocket when an event is sent", async () => {
    await lazy.send("test");
    assert(ws instanceof WebSocket);
  });

  it("should trigger the onopen event when the WebSocket is opened", async () => {
    const opened = new Promise((resolve) => {
      lazy.addEventListener("open", resolve);
    });
    await lazy.ready;
    await opened;
  });

  it("should trigger the onclose event when the WebSocket is closed", async () => {
    const closed = new Promise((resolve) => {
      lazy.addEventListener("close", resolve);
    });
    await lazy.ready;
    await lazy.close();
    await closed;
  });

  it("should trigger the onerror event when the WebSocket errors", async () => {
    const errored = new Promise((resolve) => {
      lazy.addEventListener("error", resolve);
    });
    await lazy.ready;
    ws.dispatchEvent(new Event("error"));
    await errored;
  });

  it("should trigger the onmessage event when the WebSocket receives a message", async () => {
    const messaged = new Promise((resolve) => {
      lazy.addEventListener("message", resolve);
    });
    await lazy.ready;
    ws.dispatchEvent(new MessageEvent("message", { data: "test" }));
    await messaged;
  });

  it("should close the WebSocket when the LazyWebSocket is closed", async () => {
    await lazy.close();
    assertEquals(ws.readyState, WebSocket.CLOSED);
  });
});
