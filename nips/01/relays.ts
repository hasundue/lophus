import type {
  EventId,
  RelayToClientMessage,
  RelayToClientMessageType,
  SubscriptionId,
} from "../../core/protocol.d.ts";
import { NostrNodeEvent } from "../../core/nodes.ts";
import { EventRejected, RelayModuleInstaller } from "../../core/relays.ts";

type RelayModuleEvent = EventReceived | EventAccepted;

class EventReceived
  extends NostrNodeEvent<SubscriptionId, SubscriptionMessage> {
  constructor(data: SubscriptionMessage) {
    super(data[1], { data });
  }
}

class EventAccepted extends NostrNodeEvent<EventId, PublicationMessage> {
  constructor(data: PublicationMessage) {
    super(data[1], { data });
  }
}

type SubscriptionMessage = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends
    SubscriptionId ? RelayToClientMessage<T> : never;
}[RelayToClientMessageType];

type PublicationMessage = {
  [T in RelayToClientMessageType]: RelayToClientMessage<T>[1] extends EventId
    ? RelayToClientMessage<T>
    : never;
}[RelayToClientMessageType];

const install: RelayModuleInstaller<RelayModuleEvent> = (relay) => {
  relay.addEventListener("message", ({ data: message }) => {
    switch (message[0]) {
      case "EVENT":
      case "EOSE": {
        return relay.dispatchEvent(new EventReceived(message));
      }
      case "OK": {
        return relay.dispatchEvent(new EventAccepted(message));
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
            return controller.close();
          }
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
