import "../01.ts";

declare module "../01.ts" {
  enum NIP {
    Authentication = 42,
  }
  enum EventKind {
    ClientAuth = 22242,
  }
  interface EventKindRecord {
    22242: {
      Tag: Tag<"relay" | "challenge">;
      Content: "";
      ResponsePrefix: "restricted";
    };
  }
  interface TagContent {
    "relay": [RelayUrl];
    "challenge": [string];
  }
  interface RelayToClientMessageContent {
    AUTH: [challenge: string];
  }
  interface ClientToRelayMessageContent {
    AUTH: [NostrEvent<22242>];
  }
}
