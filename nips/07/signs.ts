import type { Stringified } from "../../lib/types.ts";
import { EventContent, EventKind, NostrEvent } from "../../core/protocol.ts";
import { EventInit } from "../../std/events.ts";
import { Timestamp } from "../../std/times.ts";
import { UnsignedEvent } from "./protocol.ts";

/**
 * A transform stream that signs events.
 */
export class Signer extends TransformStream<EventInit, NostrEvent> {
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
      created_at: Timestamp.now,
      tags: [],
      ...init,
      content: JSON.stringify(init.content) as Stringified<EventContent<K>>,
      // TODO: Can we avoid this type assertion?
    } as UnsignedEvent<K>;
    // deno-lint-ignore no-window
    return window.nostr!.signEvent(unsigned);
  }
}
