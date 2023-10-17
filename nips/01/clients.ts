import type { NostrEvent } from "../../core/protocol.d.ts";
import { ClientModule, ClientSubscriptionEvent } from "../../core/clients.ts";

export default {
  async handleClientToRelayMessage({ message, client }) {
    const messenger = client.getWriter();
    const kind = message[0];
    if (kind === "EVENT") {
      const event = message[1];

      // This should throw if the event is not acceptable.
      await client.callFunction("acceptEvent", { event, client });

      await messenger.ready;
      return messenger.write(["OK", event.id, true, ""]);
    }
    if (kind === "CLOSE") {
      const sid = message[1];
      const sub = client.subscriptions.get(sid);
      if (!sub) {
        return messenger.write(["NOTICE", `Unknown subscription ID: ${sid}`]);
      }
      client.subscriptions.delete(sid);
      return sub.close();
    }
    if (kind === "REQ") {
      const sid = message[1];
      client.subscriptions.set(
        sid,
        new WritableStream<NostrEvent>({
          write: async (event) => {
            await messenger.ready;
            return messenger.write(["EVENT", sid, event]);
          },
        }),
      );
      return client.dispatchEvent(
        new ClientSubscriptionEvent(sid, { data: message }),
      );
    }
  },
} satisfies ClientModule["default"];
