import { Stringified, Timestamp } from "@lophus/lib";
import type {
  EventContent,
  EventInit,
  EventKind,
  NostrEvent,
  UnsignedEvent,
} from "@lophus/core/protocol";
import "./protocol.ts";

/**
 * A transform stream that signs events with a NIP-07 extention.
 */
export class Signer extends TransformStream<EventInit, NostrEvent> {
  constructor() {
    if (!self.nostr) {
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
      kind: init.kind,
      tags: init.tags ?? [],
      created_at: Timestamp.now,
      content: JSON.stringify(init.content) as Stringified<EventContent<K>>,
      // TODO: Allow empty tags in NostrEvent and remove this cast
    } as UnsignedEvent<K>;
    return self.nostr!.signEvent(unsigned);
  }
}
