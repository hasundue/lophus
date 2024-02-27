import { EventRejected, RelayModule } from "../../core/relays.ts";

export class SubscriptionClosed extends Error {}

export const install: RelayModule["install"] = (relay) => {
  relay.on("message", (message) => {
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

  relay.on("subscribe", ({ id, filters, options, controller }) => {
    relay.on(id, (message) => {
      switch (message[0]) {
        case "EVENT": {
          const [, , event] = message;
          return controller.enqueue(event);
        }
        case "EOSE": {
          if (!options.realtime) {
            controller.close();
          }
          break;
        }
        case "CLOSED": {
          return controller.error(new SubscriptionClosed(message[2]));
        }
      }
    });
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

export default { install };
