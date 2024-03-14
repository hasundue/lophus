import {
  EventKind,
  NostrEvent,
  PublicKey,
  UnsignedEvent,
} from "@lophus/core/protocol";
import "../protocol.ts";

declare module "../protocol.ts" {
  interface NipRecord {
    7: Record<string, never>;
  }
}

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): PublicKey;
      signEvent<K extends EventKind>(event: UnsignedEvent<K>): NostrEvent<K>;
    };
  }
}
