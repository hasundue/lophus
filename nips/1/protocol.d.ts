/**
 * Implementation of extendable part of NIP-01 (Nostr basic protocol):
 * https://github.com/nostr-protocol/nips/blob/master/01.md
 *
 * See also `../../core/protocol.d.ts` for the unextendable part.
 *
 * @module
 */

import "../../core/protocol.d.ts";
import type { Url } from "../../core/types.ts";

declare module "../../core/protocol.d.ts" {
  interface NipRecord {
    1: {
      ClientToRelayMessage: "EVENT" | "REQ" | "CLOSE";
      RelayToClientMessage: "EVENT" | "OK" | "EOSE" | "NOTICE";
      EventKind: 0 | 1;
      Tag: "e" | "p" | "a" | "d";
    };
  }
  interface TagRecord {
    /** Event ID */
    "e": [EventId, RelayUrl?];
    /** Public key */
    "p": [PublicKey, RelayUrl?];
    /** (Maybe parameterized) replaceable event */
    "a":
      | [`${EventKind}:${PublicKey}:${TagValue<"d">}`, RelayUrl?]
      | [`${EventKind}:${PublicKey}`, RelayUrl?];
    /** Identifier */
    "d": [string];
  }
  interface ClientToRelayMessageRecord<
    K extends EventKind = EventKind,
  > {
    EVENT: [NostrEvent<K>];
    REQ: [SubscriptionId, ...SubscriptionFilter<K>[]];
    CLOSE: [SubscriptionId];
  }
  interface RelayToClientMessageRecord<
    K extends EventKind = EventKind,
  > {
    EVENT: [SubscriptionId, NostrEvent<K>];
    OK: OkMessageContent<K, true> | OkMessageContent<K, false>;
    EOSE: [SubscriptionId];
    NOTICE: [string];
  }
  interface EventKindRecord {
    0: {
      Tag: Tag;
      Content: {
        name: string;
        about: string;
        picture: Url;
      };
    };
    1: {
      Tag: Tag;
      Content: string;
    };
  }
}
