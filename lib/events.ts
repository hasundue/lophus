import type {
  ClientToRelayMessage,
  EventContent,
  EventKind,
  PrivateKey,
  Stringified,
  Tag,
} from "../core/types.ts";
import { Relay } from "../client.ts";

export { EventKind } from "../core/types.ts";

export interface EventInit<K extends EventKind = EventKind> {
  kind: K;
  tags?: Tag[];
  content: EventContent[K] | Stringified<EventContent[K]>;
}

import { Signer } from "./signs.ts";

export class EventPublisher<K extends EventKind = EventKind>
  extends WritableStream<EventInit<K>> {
  #signer: Signer;
  #messenger: WritableStreamDefaultWriter<ClientToRelayMessage>;

  constructor(relay: Relay, nsec: PrivateKey) {
    super({
      write: (event) => this.publish(event),
      close: () => this.#messenger.releaseLock(),
    });
    this.#signer = new Signer(nsec);
    this.#messenger = relay.getWriter();
  }

  publish<K extends EventKind>(event: EventInit<K>): Promise<void> {
    return this.#messenger.write(["EVENT", this.#signer.sign(event)]);
  }
}
