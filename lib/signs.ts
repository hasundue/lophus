import {
  EventId,
  EventKind,
  EventSerializePrecursor,
  NostrEvent,
  Signature,
} from "../nips/01.ts";
import { Brand } from "../core/types.ts";
import { bytesToHex, schnorr, sha256 } from "../lib/x/noble.ts";
import { Timestamp } from "./times.ts";
import { EventTemplate } from "./notes.ts";

export type PrivateKey = Brand<string, "PrivateKey">;

export const PrivateKey = {
  generate: () => bytesToHex(schnorr.utils.randomPrivateKey()) as PrivateKey,
};

export type PublicKey = Brand<string, "PublicKey">;

export const PublicKey = {
  from: (nsec: PrivateKey) =>
    bytesToHex(schnorr.getPublicKey(nsec)) as PublicKey,
};

export interface UnsignedEvent<K extends EventKind = EventKind>
  extends EventTemplate<K> {
  pubkey: PublicKey;
  created_at: Timestamp;
}

function createPrecursor(ev: UnsignedEvent): EventSerializePrecursor {
  return [
    0,
    ev.pubkey,
    ev.created_at,
    ev.kind,
    ev.tags,
    ev.content,
  ];
}

type SerializedEvent = Brand<string, "SerializedEvent">;

function serialize(event: UnsignedEvent): SerializedEvent {
  return JSON.stringify(createPrecursor(event)) as SerializedEvent;
}

export class Signer extends TransformStream<UnsignedEvent, NostrEvent> {
  #encoder = new TextEncoder();

  constructor(readonly nsec: PrivateKey) {
    super({
      transform: (event, controller) => {
        controller.enqueue(this.sign(event));
      },
    });
  }

  sign(event: UnsignedEvent): NostrEvent {
    const hash = sha256(this.#encoder.encode(serialize(event)));
    const sig = schnorr.sign(hash, this.nsec);
    return {
      ...event,
      id: bytesToHex(hash) as EventId,
      sig: bytesToHex(sig) as Signature,
    };
  }
}

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
