import type { RelayHandlers } from "../../core/relays.ts";
import "./mod.ts";

export default {
  handleRelayToClientMessage({ message }) {
    const type = message[0];
    if (type === "AUTH") {
      console.log("AUTH", message);
    }
  },
} satisfies RelayHandlers;
