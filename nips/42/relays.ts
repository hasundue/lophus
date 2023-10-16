import type { Stringified } from "../../core/types.ts";
import type { RelayModule } from "../../core/relays.ts";
import type { EventInit } from "../../lib/events.ts";
import "./protocol.d.ts";

export default {
  handleRelayToClientMessage({ message, relay }) {
    const type = message[0];
    if (type !== "AUTH") {
      // This NIP only handles AUTH messages
      return;
    }
    if (!relay.config.signer) {
      // This NIP requires a signer
      throw new Error("No signer configured for relay");
    }
    const event: EventInit<22242> = {
      kind: 22242,
      tags: [
        ["relay", relay.config.url],
        ["challenge", message[1]],
      ],
      content: "" as Stringified<"">,
    };
    return relay.publish(relay.config.signer.sign(event));
  },
} satisfies RelayModule["default"];
