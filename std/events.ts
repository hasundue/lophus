import type {
  ClientToRelayMessage,
  EventContent,
  EventKind,
  NostrEvent,
} from "../core/protocol.ts";
import { Stringified } from "../lib/types.ts";

export interface EventInit<K extends EventKind = EventKind> {
  kind: NostrEvent<K>["kind"];
  tags?: NostrEvent<K>["tags"];
  content: EventContent<K> | Stringified<EventContent<K>>;
}

import type { Signer } from "./signs.ts";

export class EventPublisher<K extends EventKind = EventKind>
  extends TransformStream<EventInit<K>, ClientToRelayMessage<"EVENT", K>> {
  constructor(readonly signer: Signer) {
    super({
      transform: (init, controller) => {
        controller.enqueue(["EVENT", this.signer.sign(init)]);
      },
    });
  }
}
