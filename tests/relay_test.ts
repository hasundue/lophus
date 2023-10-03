import { EventMessage, NostrEvent, SubscriptionId } from "../core/nips/01.ts";
import { Client } from "../relay.ts";
import { afterAll, beforeAll, describe, it } from "../lib/std/testing.ts";
import { assert, assertEquals } from "../lib/std/assert.ts";
import { MockWebSocket } from "../lib/testing.ts";

describe("Client", () => {
  let ws: MockWebSocket;
  let client: Client;
  let subid: SubscriptionId;

  beforeAll(() => {
    ws = new MockWebSocket();
    client = new Client(ws);
  });
  afterAll(() => {
    client.close();
  });

  describe("constructor", () => {
    it("should create a Client instance", () => {
      assert(client instanceof Client);
    });
  });

  describe("events", () => {
    it("should return a ReadableStream of events", () => {
      assert(client.events instanceof ReadableStream);
    });
    it("should receive events", async () => {
      const ev = { kind: 0 };
      ws.dispatchEvent(
        new MessageEvent("message", {
          data: JSON.stringify(["EVENT", ev]),
        }),
      );
      const reader = client.events.getReader();
      const { value } = await reader.read();
      assertEquals(value, ev);
    });
  });

  describe("requests", () => {
    it("should return a ReadableStream of requests", () => {
      assert(client.requests instanceof ReadableStream);
    });
    it("should receive requests", async () => {
      subid = "test" as SubscriptionId;
      const req = { kinds: [0] };
      ws.dispatchEvent(
        new MessageEvent("message", {
          data: JSON.stringify(["REQ", subid, req]),
        }),
      );
      const reader = client.requests.getReader();
      const { value } = await reader.read();
      assertEquals(value, [subid, req]);
    });
  });

  describe("subscriptions", () => {
    let sub: WritableStream<NostrEvent> | undefined;
    it("should return a Map of subscriptions", () => {
      assert(client.subscriptions instanceof Map);
    });
    it("should have a subscription", () => {
      sub = client.subscriptions.get(subid);
      assert(sub);
    });
    it("should be able to deliver an event to a subscription", async () => {
      const msg = { kind: 0 };
      const received = new Promise<EventMessage>((resolve) => {
        ws.remote.addEventListener("message", (ev: MessageEvent<string>) => {
          resolve(JSON.parse(ev.data));
        });
      });
      // deno-lint-ignore no-explicit-any
      sub!.getWriter().write(msg as any);
      assertEquals(await received, ["EVENT", subid, msg]);
    });
  });
});
