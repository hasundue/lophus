import type {
  EventId,
  RelayToClientMessage,
  RelayToClientMessageType,
  SubscriptionId,
} from "../../core/protocol.d.ts";
import { EventRejected, RelayEvent, RelayModule } from "../../core/relays.ts";

type SubscriptionMessage = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends
    SubscriptionId ? RelayToClientMessage<T> : never;
}[RelayToClientMessageType];

type PublicationMessage = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends EventId
    ? RelayToClientMessage<T>
    : never;
}[RelayToClientMessageType];

type ExtentionalEventTypeRecord =
  & {
    [id in SubscriptionId]: SubscriptionMessage;
  }
  & {
    [id in EventId]: PublicationMessage;
  };

declare module "../../core/relays.ts" {
  // deno-lint-ignore no-empty-interface
  interface RelayEventTypeRecord extends ExtentionalEventTypeRecord {}
}

export class SubscriptionClosed extends Error {}

const install: RelayModule["default"] = (relay) => {
  relay.addEventListener("message", ({ data: message }) => {
    switch (message[0]) {
      case "EVENT":
      case "OK":
      case "EOSE":
      case "CLOSED": {
        return relay.dispatchEvent(new RelayEvent(message[1], message));
      }
      case "NOTICE": {
        return relay.config?.logger?.info?.(message[1]);
      }
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
    return relay.send(["REQ", id, ...filters]);
  });
  relay.addEventListener("unsubscribe", ({ data: { id } }) => {
    if (relay.status === WebSocket.OPEN) {
      return relay.send(["CLOSE", id]);
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

export default install;
