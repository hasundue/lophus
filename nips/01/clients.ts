import type { NostrEvent } from "../../core/protocol.d.ts";
import { ClientModule, ClientSubscriptionEvent } from "../../core/clients.ts";

export default {
  async handleClientToRelayMessage({ message, client }) {
    const kind = message[0];
    if (kind === "EVENT") {
      const event = message[1];

      // This should throw if the event is not acceptable.
      await client.callFunction("acceptEvent", { event, client });
      return client.send(["OK", event.id, true, ""]);
    }
    if (kind === "CLOSE") {
      const sid = message[1];
      const sub = client.subscriptions.get(sid);
      if (!sub) {
        return client.send(["NOTICE", `Unknown subscription ID: ${sid}`]);
      }
      client.subscriptions.delete(sid);
      return sub.close();
    }
    if (kind === "REQ") {
      const sid = message[1];
      client.subscriptions.set(
        sid,
        new WritableStream<NostrEvent>({
          write(event) {
            return client.send(["EVENT", sid, event]);
          },
        }),
      );
      return client.dispatchEvent(
        new ClientSubscriptionEvent(sid, { data: message }),
      );
    }
  },
} satisfies ClientModule["default"];
