import "../../core/protocol.d.ts";

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
