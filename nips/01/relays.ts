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
        return relay.dispatchEvent(new SubscriptionEvent(sid, { data: msg }));
      }
      case "OK": {
        const eid = msg[1];
        return relay.dispatchEvent(new PublicationEvent(eid, { data: msg }));
      }
      case "NOTICE": {
        const notice = msg[1];
        return relay.config?.logger?.info?.(notice);
      }
    }
  },
  handleSubscriptionMessage({ msg, controller }) {
    const type = msg[0];
    switch (type) {
      case "EVENT": {
        const [, , event] = msg;
        return controller.enqueue(event);
      }
    }
  },
} satisfies RelayHandlers;
