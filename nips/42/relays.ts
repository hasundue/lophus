import type { RelayExtensionModule } from "../../core/relays.ts";

export default {
  handleRelayToClientMessage({ message }) {
    const type = message[0];
    if (type === "AUTH") {
      console.log("AUTH", message);
    }
  },
} satisfies RelayExtensionModule["default"];
