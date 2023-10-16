import "../../core/protocol.d.ts";
import "../../core/relays.ts";
import type { Signer } from "../../lib/signs.ts";

declare module "../../core/protocol.d.ts" {
  enum NIP {
    Authentication = 42,
  }
  enum EventKind {
    ClientAuth = 22242,
  }
  interface RelayToClientMessageRecord {
    AUTH: [challenge: string];
  }
  interface ClientToRelayMessageRecord {
    AUTH: [NostrEvent<22242>];
  }
  interface EventKindRecord {
    22242: {
      Tag: Tag<"relay" | "challenge">;
      Content: "";
      ResponsePrefix: "restricted";
    };
  }
  interface TagRecord {
    "relay": [RelayUrl];
    "challenge": [string];
  }
}

declare module "../../core/relays.ts" {
  interface RelayConfig {
    signer?: Signer;
  }
}
