import "../01.ts";

declare module "../01.ts" {
  enum EventKind {
    ClientAuth = 22242,
  }
  interface TagFor {
    22242: Tag<"relay" | "challenge">;
  }
  interface TagValue {
    "relay": RelayUrl;
    "challenge": string;
  }
  interface EventContentFor {
    22242: "";
  }
  interface RelayToClientMessageContent {
    AUTH: [challenge: string];
  }
  interface OkMessageBodyPrefixFor {
    22242: "restricted";
  }
  interface NoticeMessageBodyPrefixFor {
    22242: "restricted";
  }
  interface ClientToRelayMessageContent {
    AUTH: [NostrEvent<22242>];
  }
}
