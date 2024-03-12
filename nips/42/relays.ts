import type { Stringified } from "../../lib/types.ts";
import type { RelayModule } from "../../core/relays.ts";
import type { EventInit } from "../../std/events.ts";
import type { Signer } from "../../std/signs.ts";
import "./protocol.ts";

declare module "../../core/relays.ts" {
  interface RelayConfig {
    signer?: Signer;
  }
}

const install: RelayModule["install"] = (relay) => {
  relay.on("message", (message) => {
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
