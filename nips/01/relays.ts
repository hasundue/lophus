import { EventRejected, RelayModuleInstaller } from "../../core/relays.ts";

const install: RelayModuleInstaller = (relay) => {
  relay.addEventListener("subscribe", (ev) => {
    const { controller } = ev.data;
    controller.close();
  });
};

export default {
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
