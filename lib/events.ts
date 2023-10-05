import type {
  ClientToRelayMessage,
  EventContentFor,
  EventKind,
  PrivateKey,
  RelayLike,
  TagFor,
} from "../mod.ts";
import { Stringified } from "../core/types.ts";

export interface EventInit<K extends EventKind = EventKind> {
  kind: K;
  tags?: TagFor[K][];
  content: EventContentFor[K] | Stringified<EventContentFor[K]>;
}

import { Signer } from "./signs.ts";

export class EventPublisher<K extends EventKind = EventKind>
  extends WritableStream<EventInit<K>> {
  #signer: Signer;
  #messenger: WritableStreamDefaultWriter<ClientToRelayMessage>;

  constructor(relayLike: RelayLike, nsec: PrivateKey) {
    super({
      write: (event) => this.publish(event),
      close: () => this.#messenger.releaseLock(),
    });
    this.#signer = new Signer(nsec);
    this.#messenger = relayLike.getWriter();
  }

  publish<K extends EventKind>(event: EventInit<K>): Promise<void> {
    return this.#messenger.write(["EVENT", this.#signer.sign(event)]);
  }
}
