import type { Brand, Stringified } from "../core/types.ts";
import type {
  EventContentFor,
  EventId,
  EventKind,
  EventSerializePrecursor,
  NostrEvent,
  Signature,
} from "../core/protocol.d.ts";
import type { UnsignedEvent } from "../nips/07/protocol.d.ts";
import { bytesToHex, schnorr, sha256 } from "./x/noble.ts";
import type { EventInit } from "./events.ts";
import { Timestamp } from "./times.ts";

export type { UnsignedEvent } from "../nips/07/protocol.d.ts";

export type PrivateKey = Brand<string, "PrivateKey">;

export const PrivateKey = {
  generate: () => bytesToHex(schnorr.utils.randomPrivateKey()) as PrivateKey,
};

export type PublicKey = Brand<string, "PublicKey">;

export const PublicKey = {
  from: (nsec: PrivateKey) =>
    bytesToHex(schnorr.getPublicKey(nsec)) as PublicKey,
};

/**
 * A transform stream that signs events.
 */
export class Signer extends TransformStream<EventInit, NostrEvent> {
  #encoder = new TextEncoder();

  constructor(readonly nsec: PrivateKey) {
    super({
      transform: (event, controller) => {
        controller.enqueue(this.sign(event));
      },
    });
  }

  sign<K extends EventKind>(event: EventInit<K>): NostrEvent<K> {
    if (isSigned(event)) return event;
    const unsigned = {
      created_at: Timestamp.now,
      tags: [],
      ...event,
      content: JSON.stringify(event.content) as Stringified<EventContentFor<K>>,
    } satisfies UnsignedEvent<K>;
    const precursor = { ...unsigned, pubkey: PublicKey.from(this.nsec) };
    const hash = sha256(this.#encoder.encode(serialize(precursor)));
    return {
      ...precursor,
      id: bytesToHex(hash) as EventId,
      sig: bytesToHex(schnorr.sign(hash, this.nsec)) as Signature,
    };
  }
}

/**
 * A type guard that checks if an event has been signed.
 */
export function isSigned<K extends EventKind>(
  event: EventInit<K>,
): event is NostrEvent<K> {
  return "sig" in event && "id" in event;
}

/**
 * A transform stream that verifies events.
 */
export class Verifier extends TransformStream<NostrEvent, NostrEvent> {
  constructor() {
    super({
      transform: (ev, controller) => {
        if (this.verify(ev)) {
          controller.enqueue(ev);
        }
      },
    });
  }
  verify(event: NostrEvent): boolean {
    const hash = sha256(serialize(event));
    return schnorr.verify(event.sig, hash, event.pubkey);
  }
}

// A helper function that creates a precursor to a serialized event.
function createPrecursor<K extends EventKind>(
  event: UnsignedEvent<K> & { pubkey: PublicKey },
): EventSerializePrecursor<K> {
  return [
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags ?? [],
    event.content,
  ];
}

// A helper function that serializes an event.
function serialize<K extends EventKind>(
  event: UnsignedEvent<K> & { pubkey: PublicKey },
): SerializedEvent<K> {
  return JSON.stringify(createPrecursor(event)) as SerializedEvent<K>;
}

type SerializedEvent<K> = string & { __kind: K };
