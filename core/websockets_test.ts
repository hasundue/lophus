import {
  afterAll,
  afterEach,
  assert,
  assertEquals,
  beforeEach,
  beforeAll,
  describe,
  it,
} from "../lib/std/testing.ts";
import { Server } from "../lib/x/mock-socket.ts";
import { LazyWebSocket } from "./websockets.ts";
import { Notify } from "./x/async.ts";

describe("LazyWebSocket", () => {
  let server: Server;
  let lazy: LazyWebSocket;
  let promise: Promise<boolean>

  beforeAll(() => {
    const url = "wss://localhost:8080";
    server = new Server(url);
    lazy = new LazyWebSocket(url);
  });

  afterAll(() => {
    server.close();
    lazy.close();
  });

  it("should be able to create a LazyWebSocket instance", () => {
    assert(lazy instanceof LazyWebSocket);
  });

  it("should not open a WebSocket until it is needed", () => {
    assertEquals(lazy.readyState, WebSocket.CLOSED);
  });

  it("should not open a WebSocket when an event listener is added", () => {
    promise = new Promise((resolve) => {
      lazy.addEventListener("open", () => resolve(true));
    });
    assertEquals(lazy.readyState, WebSocket.CLOSED);
  });

  // it("should trigger the onopen event when an event is sent", async () => {
  //   await lazy.send("test");
  //   assert(await promise);
  // });

//   it("should open the WebSocket when an event is sent", () => {
//     assertEquals(lazy.readyState, WebSocket.OPEN);
//   });

  it("should trigger the onerror event when the WebSocket errors", async () => {
    await lazy.ready();
    const errored = new Promise((resolve) => {
      lazy.addEventListener("error", resolve);
    });
    lazy.dispatchEvent(new Event("error"));
    await errored;
  });

  it("should trigger the onmessage event when the WebSocket receives a message", async () => {
    await lazy.ready();
    const messaged = new Promise((resolve) => {
      lazy.addEventListener("message", resolve);
    });
    server.emit("message", "test");
    await messaged;
  });

  it("should trigger the onclose event when the WebSocket is closed", async () => {
    await lazy.ready();
    const closed = new Promise((resolve) => {
      lazy.addEventListener("close", resolve);
    });
    lazy.dispatchEvent(new CloseEvent("close"));
    await closed;
  });

//   it("should close the WebSocket when the LazyWebSocket is closed", () => {
//     lazy.close();
//     assertEquals(lazy.readyState, WebSocket.CLOSED);
//   });
});
