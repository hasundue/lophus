import { NostrEvent } from "./01.ts";

declare module "./01.ts" {
  enum NIP {
    ContactList = 2,
  }
  enum EventKind {
    ContactList = 3,
  }
  interface EventKindRecord {
    3: {
      Tag: ["p", PublicKey, RelayUrl, string];
      Content: "";
    };
  }
}

export type ContactListEvent = NostrEvent<3>;
