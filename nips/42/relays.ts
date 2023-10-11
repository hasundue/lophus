import type { RelayHandlers } from "../../core/relays.ts";
import "./mod.ts";

export default {
  handleMessageReceived: {
    AUTH: function (ev) {
      ev.data;
    },
  },
} satisfies RelayHandlers;
