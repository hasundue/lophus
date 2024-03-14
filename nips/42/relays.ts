import type { Stringified } from "@lophus/lib/types";
import type { EventInit } from "@lophus/core/protocol";
import type { Signer } from "@lophus/std/signs";
import type { NIPModule } from "../nodes.ts";
import { Relay } from "@lophus/core/relays";

declare module "@lophus/core/relays" {
  interface RelayConfig {
    signer?: Signer;
  }
}

const M: NIPModule<typeof Relay> = (relay) => {
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

export default M;
