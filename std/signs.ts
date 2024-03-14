import { schnorr } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import type { Stringified } from "@lophus/lib/types";
import type {
  EventContent,
  EventId,
  EventInit,
  EventKind,
  EventSerializePrecursor,
  NostrEvent,
  PrivateKey,
  PublicKey,
  Signature,
  UnsignedEvent,
} from "@lophus/core/protocol";
import "@lophus/nips/01";
import "@lophus/nips/07";
import { Timestamp } from "@lophus/std/times";

export function generatePrivateKey(): PrivateKey {
  return bytesToHex(schnorr.utils.randomPrivateKey()) as PrivateKey;
}

export function fromPrivateKey(nsec: PrivateKey): PublicKey {
  return bytesToHex(schnorr.getPublicKey(nsec)) as PublicKey;
}

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
      tags: [],
      ...event,
      created_at: Timestamp.now,
      content: JSON.stringify(event.content) as Stringified<EventContent<K>>,
      // TODO: Can we avoid this type assertion?
    } as UnsignedEvent<K>;
    const pubkey = fromPrivateKey(this.nsec);
    const hash = sha256(
      this.#encoder.encode(serialize({ ...unsigned, pubkey })),
    );
    return {
      ...unsigned,
      pubkey,
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

/**
 * A transform stream that signs events with a NIP-07 extention.
 */
export class NIP07Signer extends TransformStream<EventInit, NostrEvent> {
  constructor() {
    // deno-lint-ignore no-window
    if (!window.nostr) {
      throw new Error("NIP-07 extension not installed");
    }
    super({
      transform: (init, controller) => {
        controller.enqueue(this.sign(init));
      },
    });
  }
  sign<K extends EventKind>(init: EventInit<K>): NostrEvent<K> {
    const unsigned = {
      tags: [],
      ...init,
      created_at: Timestamp.now,
      content: JSON.stringify(init.content) as Stringified<EventContent<K>>,
      // TODO: Can we avoid this type assertion?
    } as UnsignedEvent<K>;
    // deno-lint-ignore no-window
    return window.nostr!.signEvent(unsigned);
  }
}
