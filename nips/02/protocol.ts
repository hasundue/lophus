import "@lophus/core/protocol";
import "../protocol.ts";

declare module "../protocol.ts" {
  interface NipRecord {
    2: {
      Tag: "p";
      EventKind: 3;
    };
  }
}

declare module "@lophus/core/protocol" {
  interface EventKindRecord {
    3: {
      Tags: ContactTag[];
      Content: "";
    };
  }
  type ContactTag = ["p", PublicKey, RelayUrl, petname: string];
}
