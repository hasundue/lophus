import "@lophus/core/protocol";
import "../protocol.ts";

declare module "../protocol.ts" {
  interface NipRecord {
    65: {
      Tag: "r";
      EventKind: 10002;
    };
  }
}

declare module "@lophus/core/protocol" {
  interface EventKindRecord {
    10002: {
      Content: "";
      Tags: Tag<"r">[];
    };
  }
  interface TagRecord {
    "r": [RelayUrl, ...("read" | "write")[]];
  }
}
