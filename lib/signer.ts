import {
  EventId,
  EventSerializePrecursor,
  EventSignature,
  PublicKey as _PublicKey,
  SignedEvent,
  UnsignedEvent,
} from "../nips/01.ts";
import { Brand } from "../lib/types.ts";
import { bytesToHex, schnorr, sha256 } from "../lib/x/noble.ts";

export function createPrecursor(event: UnsignedEvent): EventSerializePrecursor {
  const { pubkey, created_at, kind, tags, content } = event;
  return [
    0,
    pubkey,
    created_at,
    kind,
    tags,
    content,
  ];
}

type SerializedEvent = Brand<Uint8Array, "SerializedEvent">;

export function serializeEvent(event: UnsignedEvent): SerializedEvent {
  const precursor = createPrecursor(event);
  const json = JSON.stringify(precursor);
  const encoder = new TextEncoder();
  return encoder.encode(json) as SerializedEvent;
}

export type PrivateKey = Brand<string, "PrivateKey">;

export const PrivateKey = {
  generate: () => bytesToHex(schnorr.utils.randomPrivateKey()) as PrivateKey,
};

export type PublicKey = _PublicKey;

export const PublicKey = {
  from: (nsec: PrivateKey) =>
    bytesToHex(schnorr.getPublicKey(nsec)) as PublicKey,
};

export function signEvent(
  event: UnsignedEvent,
  nsec: PrivateKey,
): SignedEvent {
  const serialized = serializeEvent(event);
  const hash = sha256(serialized);
  const sig = schnorr.sign(hash, nsec);
  return {
    ...event,
    id: bytesToHex(hash) as EventId,
    sig: bytesToHex(sig) as EventSignature,
  };
}

export class Signer extends TransformStream<UnsignedEvent, SignedEvent> {
  constructor(nsec: PrivateKey) {
    super({
      transform: (event, controller) => {
        controller.enqueue(signEvent(event, nsec));
      },
    });
  }
}
