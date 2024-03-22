import type { NostrEvent } from "@lophus/core/protocol";
import { Client } from "@lophus/core/clients";
import { NIPModule } from "../nodes.ts";

interface EventValidationContext {
  data: NostrEvent;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

declare module "@lophus/core/clients" {
  interface ClientEventTypeRecord {
    validate: EventValidationContext;
  }
}

const M: NIPModule<typeof Client> = (client) => {
  client.on("receive", (message) => {
    switch (message[0]) {
      case "EVENT": {
        const event = message[1];
        /** try {
          await new Promise((resolve, reject) => {
            client.dispatchEvent(
              new ClientEvent("validate", { data: event, resolve, reject }),
            );
          });
        } catch (err) {
          return client.send(["OK", event.id, false, err.message]);
        } */
        return client.send(["OK", event.id, true, ""]);
      }
      case "REQ": {
        const id = message[1];
        return client.subscriptions.set(
          id,
          new WritableStream<NostrEvent>({
            write(event) {
              return client.send(["EVENT", id, event]);
            },
          }),
        );
      }
      case "CLOSE": {
        const id = message[1];
        const sub = client.subscriptions.get(id);
        if (!sub) {
          return client.send(["NOTICE", `Unknown subscription ID: ${id}`]);
        }
        client.subscriptions.delete(id);
        return sub.close();
      }
    }
  });
};

export default M;
