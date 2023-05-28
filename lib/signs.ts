import type {
  EventId,
  EventKind,
  EventSerializePrecursor,
  NostrEvent,
  Signature,
} from "../nips/01.ts";
import type { Brand } from "../core/types.ts";
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
export interface UnsignedEvent<K extends EventKind = EventKind>
  extends EventInit<K> {
  pubkey: PublicKey;
  created_at: Timestamp;
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

  sign(event: EventInit): NostrEvent {
    if (signed(event)) return event;

    const unsigned = {
      ...event,
      pubkey: PublicKey.from(this.nsec),
      created_at: Timestamp.now,
    };

    const hash = sha256(this.#encoder.encode(serialize(unsigned)));

    return {
      tags: [],
      ...unsigned,
      id: bytesToHex(hash) as EventId,
      sig: bytesToHex(schnorr.sign(hash, this.nsec)) as Signature,
    };
  }
}

/**
 * A type guard that checks if an event has been signed.
 */
export function signed(event: EventInit): event is NostrEvent {
  return "sig" in event;
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
function createPrecursor(ev: UnsignedEvent): EventSerializePrecursor {
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
function serialize(event: UnsignedEvent): SerializedEvent {
  return JSON.stringify(createPrecursor(event)) as SerializedEvent;
}

type SerializedEvent = Brand<string, "SerializedEvent">;
