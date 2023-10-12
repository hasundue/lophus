import "../../core/protocol.ts";

declare module "../../core/protocol.ts" {
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
