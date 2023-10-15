import { ClientModule } from "../../core/clients.ts";

export default {
  async handleClientToRelayMessage({ message, client }) {
    const messenger = client.getWriter();
    const kind = message[0];
    if (kind === "EVENT") {
      const event = message[1];

      // TODO: Validate the event and send OkMessage<false> if necessary.

      await messenger.ready;
      messenger.write(["OK", event.id, true, ""]);
    }
    if (kind === "CLOSE") {
      const sid = message[1];
      const sub = client.subscriptions.get(sid);
      if (!sub) {
        this.config.logger?.warn?.("Unknown subscription:", sid);
        return;
      }
      this.subscriptions.delete(sid);
      return sub.close();
    }
    if (kind === "REQ") {
      const sid = message[1];
      const filter = message[2];
      this.subscriptions.set(
        sid,
        new WritableStream<NostrEvent>({
          write: async (event) => {
            await writer.ready;
            return writer.write(["EVENT", sid, event]);
          },
        }),
      );
      return enqueueRequest([sid, filter]);
    }
  },
  async acceptEvent({ event, client }) {
    const writer = client.getWriter();
    await writer.ready;
    await writer.write(["OK", event.id, true, ""]);
    writer.releaseLock();
  },
} satisfies ClientModule;
