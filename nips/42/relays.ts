import type { RelayHandlers } from "../../core/relays.ts";
import "./mod.ts";

export default {
  handleRelayToClientMessageEvent: {
    AUTH: function (ev) {
      ev.data;
    },
  },
} satisfies RelayHandlers;
