import type { NostrEvent } from "../../core/protocol.d.ts";
import { ClientModule } from "../../core/clients.ts";

interface EventValidationContext {
  data: NostrEvent;
  resolve: (value: unknown) => void;
  // deno-lint-ignore no-explicit-any
  reject: (reason?: any) => void;
}

declare module "../../core/clients.ts" {
  interface ClientEventTypeRecord {
    validate: EventValidationContext;
  }
}

export const install: ClientModule["install"] = (client) => {
  client.addEventListener("message", ({ data: message }) => {
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

export default { install };
