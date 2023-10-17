import { EventKind, NostrEvent, PublicKey } from "../../core/protocol.d.ts";
import type { Optional } from "../../lib/types.ts";

declare module "../../core/protocol.d.ts" {
  interface NipRecord {
    7: Record<string, never>;
  }
}

/**
 * An event that has not been signed.
 */
export type UnsignedEvent<K extends EventKind = EventKind> = Optional<
  NostrEvent<K>,
  "id" | "pubkey" | "sig"
>;

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): PublicKey;
      signEvent<K extends EventKind>(event: UnsignedEvent<K>): NostrEvent<K>;
    };
  }
}
