import { NIPs } from "../core/nips.ts";
import { NostrEvent } from "./01.ts";

declare module "./01.ts" {
  enum EventKind {
    ContactList = 3,
  }
  interface EventContentFor {
    3: "";
  }
  interface TagFor {
    3: ["p", PublicKey, RelayUrl, string];
  }
}

export type ContactListEvent = NostrEvent<3>;

NIPs.register(2);
