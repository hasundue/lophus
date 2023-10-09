import { Relay, RelayExtension } from "../../core/relays.ts";
import type {
  EventKind,
  NostrEvent,
  RelayToClientMessage,
} from "../01.ts";

declare module "../../core/relays.ts" {
  export interface Relay {
    subscribe<K extends EventKind>(
      filter: SubscriptionFilter<K> | SubscriptionFilter<K>[],
      opts?: Partial<SubscriptionOptions>,
    ): ReadableStream<NostrEvent<K>>;
    publish(event: NostrEvent): Promise<void>;
  }

  export class EventRejected extends Error {}
  export class RelayClosed extends Error {}
}

import { SubscriptionMessage } from "../../core/relays.ts";

export interface SubscriptionOptions {
  id: string;
  realtime: boolean;
  nbuffer: number;
}


Relay.prototype.publish = async function (event: NostrEvent): Promise<void> {
  const writer = this.getWriter();
  await writer.ready;

  // We don't await this because it blocks for a long time
  writer.write(["EVENT", event]);

  this.addEventListener(event.id, onMessage.bind(this));
};

export function onMessage(relay: Relay, msg: RelayToClientMessage) {
  const type = msg[0];
  if (type === "NOTICE") {
    // TODO: Should we have a dedicated ReadableStream for this?
    const body = msg[1];
  }
  if (type === "OK") {
    const [, eid] = msg;
    const callbacks = this.#published.get(eid);
    if (!callbacks) {
      return;
    }
    return callbacks.resolve(msg);
  }
  if (type === "EVENT" || type === "EOSE") {
    const [, sid] = msg;
    return _notify(sid, msg);
  }
}

export default {
  handleRelayEvent: {
    EVENT: () => {},
  },
  handleSubscriptionEvent: {
    EVENT: () => {},
    EOSE: () => {},
  },
} satisfies RelayExtension;
