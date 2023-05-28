import type {
  EventContent,
  EventKind,
  NostrMessage,
  PrivateKey,
  Tag,
} from "../nips/01.ts";
import { Relay } from "../client.ts";

export { EventKind } from "../nips/01.ts";

export interface EventInit<K extends EventKind = EventKind> {
  kind: K;
  tags?: Tag[];
  content: EventContent<K>;
}

import { Signer } from "./signs.ts";

export class EventPublisher<K extends EventKind = EventKind>
  extends WritableStream<EventInit<K>> {
  #signer: Signer;

  #messenger: WritableStreamDefaultWriter<NostrMessage>;

  constructor(relay: Relay, nsec: PrivateKey) {
    super({
      write: (event) => this.publish(event),
      close: () => this.#messenger.releaseLock(),
    });
    this.#signer = new Signer(nsec);
    this.#messenger = relay.getWriter();
  }

  publish(event: EventInit<K>): Promise<void> {
    return this.#messenger.write(["EVENT", this.#signer.sign(event)]);
  }
}
