import {
  PublicationEvent,
  RelayHandlers,
  SubscriptionMessageEvent,
} from "../../core/relays.ts";

export default {
  handleRelayToClientMessageEvent(ev) {
    const msg = ev.data;
    const type = msg[0];
    switch (type) {
      case "EVENT":
      case "EOSE": {
        const sid = msg[1];
        return this.dispatchEvent(new SubscriptionMessageEvent(sid, { data: msg }));
      }
      case "OK": {
        const eid = msg[1];
        return this.dispatchEvent(new PublicationEvent(eid, { data: msg }));
      }
      case "NOTICE": {
        const notice = msg[1];
        return console.log(notice);
      }
    }
  },
  handleSubscriptionMessage(ev) {
    const { id, message, controller } = ev.data;
  },
} satisfies RelayHandlers;
