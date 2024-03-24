import { EventRejected, Relay, SubscriptionClosed } from "@lophus/core/relays";
import { NIPModule } from "../nodes.ts";
import { isLimited } from "@lophus/core/filters";

export const M: NIPModule<typeof Relay> = (relay) => {
  relay.on("receive", (message) => {
    switch (message[0]) {
      case "EVENT":
      case "OK":
      case "EOSE":
      case "CLOSED":
        return relay.dispatch(message[1], message);
      default:
        return; // Ignore unknown messages.
    }
  });

  relay.on("subscribe", ({ id, filters, controller }) => {
    const aborter = new AbortController();
    relay.on(id, (message) => {
      switch (message[0]) {
        case "EVENT": {
          const [, , event] = message;
          return controller.enqueue(event);
        }
        case "EOSE": {
          if (isLimited(filters)) {
            aborter.abort();
            return controller.close();
          }
          return;
        }
        case "CLOSED": {
          aborter.abort();
          return controller.error(new SubscriptionClosed(message[2]));
        }
      }
    }, { signal: aborter.signal });
    relay.send(["REQ", id, ...filters]);
  });

  relay.on("resubscribe", ({ id, filters }) => {
    relay.send(["REQ", id, ...filters]);
  });

  relay.on("unsubscribe", ({ id }) => {
    if (relay.status === WebSocket.OPEN) {
      relay.send(["CLOSE", id]);
    }
  });

  relay.on("publish", ({ event, resolve, reject }) => {
    relay.on(event.id, (message) => {
      if (message[0] !== "OK") {
        // This NIP only supports OK messages.
        return;
      }
      const [, , accepted, reason] = message;
      if (accepted) {
        return resolve();
      }
      reject(new EventRejected(reason, { cause: event }));
    });
    return relay.send(["EVENT", event]);
  });
};

export default M;
