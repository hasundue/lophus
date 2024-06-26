/**
 * Implementation of the "optional" part of NIP-01 (Nostr basic protocol):
 * https://github.com/nostr-protocol/nips/blob/master/01.md
 *
 * See also `../../core/protocol.ts` for the unextendable part.
 *
 * @module
 */

import type { Url } from "@lophus/lib/types";
import "@lophus/core/protocol";
import "../protocol.ts";

declare module "../protocol.ts" {
  interface NipRecord {
    1: {
      ClientToRelayMessage: "EVENT" | "REQ" | "CLOSE";
      RelayToClientMessage: "EVENT" | "OK" | "EOSE" | "CLOSED" | "NOTICE";
      EventKind: 0 | 1;
      Tag: "e" | "p" | "a" | "d";
    };
  }
}

declare module "@lophus/core/protocol" {
  interface EventKindRecord {
    0: {
      OptionalTag: Tag;
      Content: {
        name: string;
        about: string;
        picture: Url;
      };
    };
    1: {
      OptionalTag: Tag;
      Content: string;
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
    REQ: [SubscriptionId, ...EventFilter<K>[]];
    CLOSE: [SubscriptionId];
  }

  interface RelayToClientMessageRecord<
    K extends EventKind = EventKind,
  > {
    EVENT: [SubscriptionId, NostrEvent<K>];
    OK:
      | [EventId, true, RelayToClientErrorMessage<K, true>]
      | [EventId, false, RelayToClientErrorMessage<K, false>];
    EOSE: [SubscriptionId];
    CLOSED: [SubscriptionId, RelayToClientErrorMessage<K, false>];
    NOTICE: [string];
  }
}
