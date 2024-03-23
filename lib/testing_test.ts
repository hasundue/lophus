import { beforeAll, describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertInstanceOf } from "@std/assert";
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
    it("should return an AsyncGenerator of WebSocket instances", () => {
      assertEquals(typeof MockWebSocket.instances().next, "function");
    });

    describe("next", () => {
      let third: Promise<IteratorResult<MockWebSocket>>;

      it("should return the first instance", async () => {
        const { value, done } = await MockWebSocket.instances().next();
        assert(!done);
        assertEquals(value.url, "");
      });

      it("should return the second instance", async () => {
        const { value, done } = await MockWebSocket.instances().next();
        assert(!done);
        assertEquals(value.url, "wss://localhost:8080");
      });

      it("should return a promise for the next instance", () => {
        third = MockWebSocket.instances().next();
        assertInstanceOf(third, Promise);
      });

      it("should return the third instance when created", async () => {
        new MockWebSocket("wss://localhost:8081");
        const { value, done } = await third;
        assert(!done);
        assertEquals(value.url, "wss://localhost:8081");
      });
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
      assert(ws.remote.url.startsWith("file:"));
      assertEquals(ws.remote.remote, ws);
    });
  });

  describe("send", () => {
    it("should send a message to the remote WebSocket", async () => {
      const promise = new Promise((resolve) => {
        ws.remote.addEventListener("message", resolve);
      });
      ws.send("test");
      assert(await promise);
    });
  });

  describe("close", () => {
    let remote_closed: Promise<unknown>;

    beforeAll(() => {
      remote_closed = new Promise((resolve) => {
        ws.remote.addEventListener("close", resolve);
      });
    });

    it("should close the WebSocket", async () => {
      const closed = new Promise<true>((resolve) => {
        ws.addEventListener("close", () => resolve(true));
      });
      ws.close();
      assertEquals(ws.readyState, WebSocket.CLOSING);
      await closed;
      assertEquals(ws.readyState, WebSocket.CLOSED);
    });

    it("should close the remote WebSocket", async () => {
      await remote_closed;
      assert(ws.remote.readyState === WebSocket.CLOSED);
    });
  });
});
