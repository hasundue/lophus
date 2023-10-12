import type { RelayHandlers } from "../../core/relays.ts";

export default {
  handleRelayToClientMessage({ msg }) {
    const type = msg[0];
    if (type === "AUTH") {
      console.log("AUTH", msg);
    }
  },
} satisfies RelayHandlers;
