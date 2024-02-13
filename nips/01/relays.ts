import type {
  EventId,
  RelayToClientMessage,
  RelayToClientMessageType,
  SubscriptionId,
} from "../../core/protocol.d.ts";
import { NostrNodeEvent } from "../../core/nodes.ts";
import { RelayModuleInstaller } from "../../core/relays.ts";

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
};

export default install;

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

/**
export {
  handleRelayToClientMessage({ message, relay }) {
    const type = message[0];
    relay.config.logger?.debug?.(relay.config.name, message);
    switch (type) {
      case "EVENT":
      case "EOSE": {
        const sid = message[1];
        return relay.dispatchEvent(
          new RelaySubscriptionEvent(sid, { data: message }),
        );
      }
      case "OK": {
        const eid = message[1];
        return relay.dispatchEvent(
          new PublicationEvent(eid, { data: message }),
        );
      }
      case "NOTICE": {
        const notice = message[1];
        return relay.config?.logger?.info?.(notice);
      }
    }
  },

  handleSubscriptionMessage({ message, options, controller }) {
    const type = message[0];
    switch (type) {
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
  },

  handlePublicationMessage({ message, event }) {
    const type = message[0];
    if (type !== "OK") {
      // This NIP only supports OK messages.
      return;
    }
    const accepted = message[2];
    if (accepted) {
      return;
    }
    const reason = message[3];
    throw new EventRejected(reason, { cause: event });
  },

  publishEvent({ event, relay }) {
    return relay.send(["EVENT", event]);
  },

  startSubscription({ filters, id, relay }) {
    return relay.send(["REQ", id, ...filters]);
  },

  closeSubscription({ id, relay }) {
    if (relay.ws.readyState === WebSocket.OPEN) {
      return relay.send(["CLOSE", id]);
    }
  },
} satisfies RelayModule["default"];
*/
