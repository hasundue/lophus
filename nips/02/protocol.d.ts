import "../../core/protocol.d.ts";

declare module "../../core/protocol.d.ts" {
  interface NipRecord {
    2: {
      Tag: "p";
    };
  }
  interface EventKindRecord {
    3: {
      Tags: ContactTag[];
      Content: "";
    };
  }
  type ContactTag = ["p", PublicKey, RelayUrl, petname: string];
}
