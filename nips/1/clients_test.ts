import { afterAll, beforeAll, describe, it } from "../../lib/std/testing.ts";
import { assert, assertEquals } from "../../lib/std/assert.ts";
import { MockWebSocket } from "../../lib/testing.ts";
import {
  ClientToRelayMessage,
  RelayToClientMessage,
  SubscriptionId,
} from "../../core/protocol.d.ts";
import { Client } from "../../core/clients.ts?nips=1";

describe("NIP01/Client", () => {
  let ws: MockWebSocket;
  let client: Client;
  let subid: SubscriptionId;

  beforeAll(() => {
    ws = new MockWebSocket();
    client = new Client(ws, { logger: console });
  });
  afterAll(() => {
    client.close();
  });

  describe.only("events", () => {
    it("should receive an event and send a OK message", async () => {
      const event = { id: "test-ok", kind: 0 };
      const received = new Promise<ClientToRelayMessage<"EVENT">>((resolve) => {
        client.addFunction(
          "handleClientToRelayMessage",
          ({ message }) => {
            if (message[0] === "EVENT") {
              resolve(message);
            }
          },
        );
      });
      const replied = new Promise<RelayToClientMessage<"OK">>((resolve) => {
        ws.remote.addEventListener("message", (ev: MessageEvent<string>) => {
          resolve(JSON.parse(ev.data));
        });
      });
      ws.remote.send(JSON.stringify(["EVENT", event]));
      assertEquals(await received, ["EVENT", event]);
      assertEquals(await replied, ["OK", "test-ok", true, ""]);
    });
  });

  describe.ignore("requests", () => {
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

  describe.ignore("subscriptions", () => {
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
      const received = new Promise<RelayToClientMessage<"EVENT">>((resolve) => {
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
