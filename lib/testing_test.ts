import { beforeAll, describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { MockWebSocket } from "@lophus/lib/testing";

describe("MockWebSocket", () => {
  let ws: MockWebSocket;

  it("should be able to replace globalThis.WebSocket", () => {
    globalThis.WebSocket = MockWebSocket;
  });

  describe("new", () => {
    it("should create an instance without a url", () => {
      ws = new MockWebSocket();
      assert(ws instanceof MockWebSocket);
    });
    it("should create an instance with a url", () => {
      const ws = new MockWebSocket("wss://localhost:8080");
      assert(ws instanceof MockWebSocket);
    });
  });

  describe("instances", () => {
    it("should return an array of instances", () => {
      assertEquals(MockWebSocket.instances.length, 2);
    });
  });

  describe("readyState", () => {
    it("should return the WebSocket.OPEN for a valid instance", () => {
      assertEquals(ws.readyState, WebSocket.OPEN);
    });
  });

  describe("remote", () => {
    it("should return a remote instance", () => {
      assert(ws.remote);
      assertEquals(ws.remote.url, ws.url);
      assertEquals(ws.remote.remote, ws);
    });
  });

  describe("send", () => {
    it("should send a message to the remote WebSocket", async () => {
      const promise = new Promise<true>((resolve) => {
        ws.remote.addEventListener("message", () => resolve(true));
      });
      ws.send("test");
      assert(await promise);
    });
  });

  describe("close", () => {
    let remote_closed: Promise<true>;

    beforeAll(() => {
      remote_closed = new Promise<true>((resolve) => {
        ws.remote.addEventListener("close", () => resolve(true));
      });
    });

    it("should close the WebSocket", async () => {
      const closed = new Promise<true>((resolve) => {
        ws.addEventListener("close", () => resolve(true));
      });
      ws.close();
      assert(await closed);
      assertEquals(ws.readyState, WebSocket.CLOSED);
    });

    it("should close the remote WebSocket", () => {
      assertEquals(ws.remote.readyState, WebSocket.CLOSED);
    });

    it("should trigger the onclose event on the remote WebSocket", async () => {
      assert(await remote_closed);
    });
  });
});
