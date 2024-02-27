import { EventRejected, RelayModule } from "../../core/relays.ts";

export class SubscriptionClosed extends Error {}

export const install: RelayModule["install"] = (relay) => {
  relay.addEventListener("message", ({ data: message }) => {
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
  relay.addEventListener("subscribe", (ev) => {
    const { id, filters, options, controller } = ev.data;
    relay.addEventListener(id, ({ data: message }) => {
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
  relay.addEventListener("resubscribe", ({ data: { id, filters } }) => {
    relay.send(["REQ", id, ...filters]);
  });
  relay.addEventListener("unsubscribe", ({ data: { id } }) => {
    if (relay.status === WebSocket.OPEN) {
      relay.send(["CLOSE", id]);
    }
  });
  relay.addEventListener("publish", (ev) => {
    const { event, resolve, reject } = ev.data;
    relay.addEventListener(event.id, ({ data: message }) => {
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
