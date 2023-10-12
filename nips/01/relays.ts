import {
  PublicationEvent,
  RelayHandlers,
  SubscriptionEvent,
} from "../../core/relays.ts";

export default {
  handleRelayToClientMessage({ msg, relay }) {
    const type = msg[0];
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
} satisfies RelayHandlers;
