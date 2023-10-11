import { Relay, RelayHandlers } from "../../core/relays.ts"

export default {
  handleMessageReceived: {
    EVENT: function (ev) {
      const [, sid, event] = ev.data;
      new BroadcastChannel(sid).postMessage(event);
    },
  },
} satisfies RelayHandlers;
