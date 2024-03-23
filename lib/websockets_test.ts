import { assert, assertEquals } from "@std/assert";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { MockWebSocket } from "@lophus/lib/testing";
import { LazyWebSocket } from "./websockets.ts";

describe("LazyWebSocket", () => {
  let lazy: LazyWebSocket;
  let socket: MockWebSocket;
  let server: MockWebSocket;
  let opened: Promise<true>;

  beforeAll(() => {
    globalThis.WebSocket = MockWebSocket;
    lazy = new LazyWebSocket("wss://localhost:8080");
  });

  afterAll(() => {
    lazy.close();
  });

  it("should be able to create a LazyWebSocket instance", () => {
    assert(lazy instanceof LazyWebSocket);
  });

  it("should not open a WebSocket until it is needed", () => {
    assertEquals(lazy.readyState, WebSocket.CLOSED);
  });

  it("should not open a WebSocket when an event listener is added", () => {
    opened = new Promise((resolve) => {
      lazy.addEventListener("open", () => resolve(true), { once: true });
    });
    assertEquals(lazy.readyState, WebSocket.CLOSED);
  });

  it("should trigger the onopen event when an event is sent", async () => {
    await lazy.send("test");
    assert(await opened);
  });

  it("should open the WebSocket when an event is sent", () => {
    assertEquals(lazy.readyState, WebSocket.OPEN);
  });

  it("should trigger the onerror event when errors", async () => {
    const errored = new Promise((resolve) => {
      lazy.addEventListener("error", resolve);
    });
    const { value } = await MockWebSocket.instances().next();
    socket = value!;
    socket.dispatchEvent(new Event("error"));
    await errored;
  });

  it("should trigger the onmessage event when receives a message", async () => {
    const messaged = new Promise((resolve) => {
      lazy.addEventListener("message", resolve, { once: true });
    });
    server = socket.remote;
    server.send("test");
    await messaged;
  });

  it("should trigger the onclose event when the WebSocket is closed", async () => {
    await lazy.ready();
    const closed = new Promise((resolve) => {
      lazy.addEventListener("close", resolve, { once: true });
    });
    server.close();
    await closed;
  });

  it("should reregister the event listeners when the WebSocket is recreated", async () => {
    const closed = new Promise((resolve) => {
      lazy.addEventListener("close", resolve, { once: true });
    });
    await lazy.ready();
    server.close();
    await closed;
  });

  it("should close the WebSocket when the LazyWebSocket is closed", async () => {
    await lazy.close();
    assertEquals(lazy.readyState, WebSocket.CLOSED);
  });
});
