import {
  EventRejected,
  PublicationEvent,
  RelayModule,
  RelaySubscriptionEvent,
} from "../../core/relays.ts";

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
    const writer = relay.getWriter();
    writer.ready.then(() => writer.write(["EVENT", event]));
  },

  startSubscription({ filters, id, relay }) {
    const messenger = relay.getWriter();
    return messenger.write(["REQ", id, ...filters]);
  },

  async closeSubscription({ id, relay }) {
    const messenger = relay.getWriter();
    if (relay.ws.readyState === WebSocket.OPEN) {
      await messenger.write(["CLOSE", id]);
    }
    return messenger.close();
  },
} satisfies RelayModule["default"];
