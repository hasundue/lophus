import type {
  ClientToRelayMessage,
  EventContentFor,
  EventKind,
  TagFor,
} from "../mod.ts";
import { Stringified } from "../core/types.ts";

export interface EventInit<K extends EventKind = EventKind> {
  kind: K;
  tags?: TagFor<K>[];
  content: EventContentFor<K> | Stringified<EventContentFor<K>>;
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
