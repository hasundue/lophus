import type { Stringified } from "../../core/types.ts";
import type { RelayModule } from "../../core/relays.ts";
import type { EventInit } from "../../lib/events.ts";
import type { Signer } from "../../lib/signs.ts";
import "./protocol.d.ts";

declare module "../../core/relays.ts" {
  interface RelayConfig {
    signer?: Signer;
  }
}

const install: RelayModule["install"] = (relay) => {
  relay.addEventListener("message", ({ data: message }) => {
    if (message[0] !== "AUTH") {
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
  });
};

export default { install };
