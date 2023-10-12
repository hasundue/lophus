import {
  EventRejected,
  PublicationEvent,
  RelayHandlers,
  SubscriptionEvent,
} from "../../core/relays.ts";

export default {
  handleRelayToClientMessage({ msg, relay }) {
    const type = msg[0];
    relay.config.logger?.debug?.(relay.config.name, msg);
    switch (type) {
      case "EVENT":
      case "EOSE": {
        const sid = msg[1];
        return relay.dispatchEvent(
          new SubscriptionEvent(`${sid}:receive`, { data: msg }),
        );
      }
      case "OK": {
        const eid = msg[1];
        return relay.dispatchEvent(
          new PublicationEvent(`${eid}:response`, { data: msg }),
        );
      }
      case "NOTICE": {
        const notice = msg[1];
        return relay.config?.logger?.info?.(notice);
      }
    }
  },
  handleSubscriptionMessage({ msg, options, controller }) {
    const type = msg[0];
    switch (type) {
      case "EVENT": {
        const [, , event] = msg;
        return controller.enqueue(event);
      }
      case "EOSE": {
        if (!options.realtime) {
          controller.close();
        }
      }
    }
  },
  handlePublicationMessage({ msg, event }) {
    const type = msg[0];
    if (type !== "OK") {
      // This NIP only supports OK messages.
      return;
    }
    const accepted = msg[2];
    if (accepted) {
      return;
    }
    const reason = msg[3];
    throw new EventRejected(reason, { cause: event });
  },
} satisfies RelayHandlers;
