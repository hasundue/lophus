import {
  PublicationEvent,
  RelayHandlers,
  SubscriptionEvent,
} from "../../core/relays.ts";

export default {
  handleRelayToClientMessage(ev) {
    const msg = ev.data;
    const type = msg[0];
    switch (type) {
      case "EVENT":
      case "EOSE": {
        const sid = msg[1];
        return this.dispatchEvent(new SubscriptionEvent(sid, { data: msg }));
      }
      case "OK": {
        const eid = msg[1];
        return this.dispatchEvent(new PublicationEvent(eid, { data: msg }));
      }
      case "NOTICE": {
        const notice = msg[1];
        return this.config?.logger?.info?.(notice);
      }
    }
  },
  handleSubscriptionMessage({ message, controller }) {
    const type = message[0];
    switch (type) {
      case "EVENT": {
        const [, , event] = message;
        return controller.enqueue(event);
      }
    }
  },
} satisfies RelayHandlers;
