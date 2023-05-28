import type {
  EventContent,
  EventKind,
  NostrMessage,
  PrivateKey,
  Tag,
} from "../nips/01.ts";
import { Relay } from "../client.ts";

export interface EventInit<K extends EventKind = EventKind> {
  kind: K;
  tags: Tag[];
  content: EventContent<K>;
}

import { Signer } from "./signs.ts";

export class Publisher<K extends EventKind = EventKind>
  extends WritableStream<EventInit<K>> {
  readonly signer: Signer;

  #messenger: WritableStreamDefaultWriter<NostrMessage>;

  constructor(relay: Relay, readonly nsec: PrivateKey) {
    super({
      write: (event) => this.publish(event),
      close: () => this.#messenger.releaseLock(),
    });
    this.signer = new Signer(nsec);
    this.#messenger = relay.getWriter();
  }

  publish(event: EventInit<K>): Promise<void> {
    return this.#messenger.write(["EVENT", this.signer.sign(event)]);
  }
}
