import type {
  EventKind,
  NostrEvent,
  PublicKey,
  RelayUrl,
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
      getPublicKey(): Promise<PublicKey>;
      signEvent<K extends EventKind>(event: UnsignedEvent<K>): NostrEvent<K>;
      getRelays?: () => Promise<RelayRecord>;
    };
  }
}

export interface RelayRecord {
  [url: RelayUrl]: { read: boolean; write: boolean };
}
