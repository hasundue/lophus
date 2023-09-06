import {
  afterAll,
  assert,
  assertEquals,
  beforeAll,
  describe,
  it,
} from "../lib/std/testing.ts";
import { Server } from "../lib/x/mock-socket.ts";
import { LazyWebSocket } from "./websockets.ts";

describe("LazyWebSocket", () => {
  let server: Server;
  let lazy: LazyWebSocket;

  beforeAll(() => {
    const url = "wss://localhost:8080";
    server = new Server(url);
    lazy = new LazyWebSocket(url);
  });

  afterAll(async () => {
    await lazy.close();
    server.close();
  });

  it("should be able to create a LazyWebSocket instance", () => {
    assert(lazy instanceof LazyWebSocket);
  });

  it("should not open a WebSocket until it is needed", () => {
    assertEquals(lazy.readyState, WebSocket.CLOSED);
  });

  it("should not open a WebSocket when an event listener is added", () => {
    lazy.addEventListener("message", () => {});
    assertEquals(lazy.readyState, WebSocket.CLOSED);
  });

  it("should trigger the onopen event when an event is sent", async () => {
    const opened = new Promise((resolve) => {
      lazy.addEventListener("open", resolve);
    });
    await lazy.send("test");
    await opened;
  });

  it("should open the WebSocket when an event is sent", () => {
    assertEquals(lazy.readyState, WebSocket.OPEN);
  });

  it("should trigger the onerror event when the WebSocket errors", async () => {
    const errored = new Promise((resolve) => {
      lazy.addEventListener("error", resolve);
    });
    lazy.dispatchEvent(new Event("error"));
    await errored;
  });

  it("should trigger the onmessage event when the WebSocket receives a message", async () => {
    const messaged = new Promise((resolve) => {
      lazy.addEventListener("message", resolve);
    });
    lazy.dispatchEvent(new MessageEvent("message", { data: "test" }));
    await messaged;
  });

  it("should trigger the onclose event when the WebSocket is closed", async () => {
    const closed = new Promise((resolve) => {
      lazy.addEventListener("close", resolve);
    });
    await lazy.close();
    await closed;
  });

  it("should close the WebSocket when the LazyWebSocket is closed", () => {
    assertEquals(lazy.readyState, WebSocket.CLOSED);
  });
});
