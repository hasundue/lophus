import "../../core/protocol.ts";
import "../../core/relays.ts";

declare module "../../core/protocol.ts" {
  interface NipRecord {
    42: {
      ClientToRelayMessage: "AUTH";
      RelayToClientMessage: "AUTH";
      EventKind: 22242;
      Tag: "relay" | "challenge";
    };
  }
  interface RelayToClientMessageRecord {
    AUTH: [challenge: string];
  }
  interface ClientToRelayMessageRecord {
    AUTH: [NostrEvent<22242>];
  }
  interface EventKindRecord {
    22242: {
      Tags: [Tag<"relay">, Tag<"challenge">];
      Content: "";
      ResponsePrefix: "restricted";
    };
  }
  interface TagRecord {
    "relay": [RelayUrl];
    "challenge": [string];
  }
}
