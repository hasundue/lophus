import type { Brand } from "../core/types.ts";
import type {
  EventContentFor,
  EventId,
  EventKind,
  EventSerializePrecursor,
  NostrEvent,
  Signature,
  Stringified,
} from "../nips/01.ts";
import type { EventInit } from "./events.ts";
import { Timestamp } from "./times.ts";
import { bytesToHex, schnorr, sha256 } from "./x/noble.ts";

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
 * An event that has not been signed.
 */
export type UnsignedEvent<K extends EventKind> = Omit<
  NostrEvent<K>,
  "id" | "sig"
>;

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
      pubkey: PublicKey.from(this.nsec),
      content: JSON.stringify(event.content) as Stringified<EventContentFor[K]>,
    } satisfies UnsignedEvent<K>;

    const hash = sha256(this.#encoder.encode(serialize(unsigned)));

    return {
      ...unsigned,
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
  verify(ev: NostrEvent): boolean {
    const hash = sha256(serialize(ev));
    return schnorr.verify(ev.sig, hash, ev.pubkey);
  }
}

// A helper function that creates a precursor to a serialized event.
function createPrecursor<K extends EventKind>(
  ev: UnsignedEvent<K>,
): EventSerializePrecursor<K> {
  return [
    0,
    ev.pubkey,
    ev.created_at,
    ev.kind,
    ev.tags ?? [],
    ev.content,
  ];
}

// A helper function that serializes an event.
function serialize<K extends EventKind>(
  event: UnsignedEvent<K>,
): SerializedEvent<K> {
  return JSON.stringify(createPrecursor(event)) as SerializedEvent<K>;
}

type SerializedEvent<K> = string & { __kind: K };
