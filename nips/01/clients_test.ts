import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { MockWebSocket } from "@lophus/lib/testing";
import {
  ClientToRelayMessage,
  NostrEvent,
  RelayToClientMessage,
  SubscriptionId,
} from "@lophus/core/protocol";
import { Client } from "../clients.ts";

describe("Client (NIP-01)", () => {
  let ws: MockWebSocket;
  let client: Client;
  let subid: SubscriptionId;
  let sub: WritableStream<NostrEvent>;

  beforeAll(() => {
    ws = new MockWebSocket();
    client = new Client(ws);
  });
  afterAll(() => {
    client.close();
  });

  it("should return an empty Map of subscriptions", () => {
    assert(client.subscriptions instanceof Map);
    assertEquals(client.subscriptions.size, 0);
  });

  it("should receive an event and send a OK message", async () => {
    const event = { id: "test-ok", kind: 0 };
    const received = new Promise<ClientToRelayMessage<"EVENT">>((resolve) =>
      client.on("message", (msg) => {
        if (msg[0] === "EVENT") resolve(msg);
      })
    );
    const replied = new Promise<RelayToClientMessage<"OK">>((resolve) => {
      ws.remote.addEventListener("message", (ev: MessageEvent<string>) => {
        resolve(JSON.parse(ev.data));
      });
    });
    ws.remote.send(JSON.stringify(["EVENT", event]));
    assertEquals(await received, ["EVENT", event]);
    assertEquals(await replied, ["OK", "test-ok", true, ""]);
  });

  it("should accept a subscription request", async () => {
    subid = "test-req" as SubscriptionId;
    const request: ClientToRelayMessage<"REQ"> = ["REQ", subid, { kinds: [1] }];
    const received = new Promise<ClientToRelayMessage<"REQ">>((resolve) => {
      client.on("message", (msg) => {
        if (msg[0] === "REQ" && msg[1] === subid) resolve(msg);
      });
    });
    ws.remote.send(JSON.stringify(request));
    assertEquals(await received, request);
  });

  it("should have a subscription", () => {
    const _sub = client.subscriptions.get(subid);
    assert(_sub);
    sub = _sub;
  });

  it("should be able to deliver an event to a subscription", async () => {
    const msg = { kind: 0 };
    const received = new Promise<RelayToClientMessage<"EVENT">>((resolve) => {
      ws.remote.addEventListener("message", (ev: MessageEvent<string>) => {
        resolve(JSON.parse(ev.data));
      });
    });
    // deno-lint-ignore no-explicit-any
    sub.getWriter().write(msg as any);
    assertEquals(await received, ["EVENT", subid, msg]);
  });
});
