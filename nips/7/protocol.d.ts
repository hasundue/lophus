import { EventKind, NostrEvent, PublicKey } from "../../core/protocol.d.ts";

/**
 * An event that has not been signed.
 */
export type UnsignedEvent<K extends EventKind = EventKind> = Omit<
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
