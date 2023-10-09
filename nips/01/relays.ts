import type { Stringified } from "../../core/types.ts";
import { NonExclusiveWritableStream } from "../../core/streams.ts";
import { Relay, RelayExtension } from "../../core/relays.ts";
import type {
  ClientToRelayMessage,
  EventKind,
  NostrEvent,
  RelayToClientMessage,
  SubscriptionFilter,
  SubscriptionId,
} from "../01.ts";

declare module "../../core/relays.ts" {
  export interface SubscriptionOptions {
    id: string;
    realtime: boolean;
    nbuffer: number;
  }

  export interface Relay {
    subscribe<K extends EventKind>(
      filter: SubscriptionFilter<K> | SubscriptionFilter<K>[],
      opts?: Partial<SubscriptionOptions>,
    ): ReadableStream<NostrEvent<K>>;
    publish(event: NostrEvent): Promise<void>;
  }

  export interface RelayLike
    extends NonExclusiveWritableStream<ClientToRelayMessage> {
    subscribe: Relay["subscribe"];
  }

  export class EventRejected extends Error {}
  export class RelayClosed extends Error {}
}

export interface SubscriptionOptions {
  id: string;
  realtime: boolean;
  nbuffer: number;
}

Relay.prototype.subscribe = function <K extends EventKind>(
  filter: SubscriptionFilter<K> | SubscriptionFilter<K>[],
  opts: Partial<SubscriptionOptions> = {},
): ReadableStream<NostrEvent<K>> {
  const sid = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
  opts.realtime ??= true;
  opts.nbuffer ??= this.config.nbuffer;

  const messenger = this.getWriter();
  const request = () => messenger.write(["REQ", sid, ...[filter].flat()]);

  return new ReadableStream<NostrEvent<K>>({
    start: () => {
      this.addEventListener(sid, handleSubscriptionEvent.bind(this));
      this.ws.addEventListener("open", request);
      if (this.ws.readyState === WebSocket.OPEN) {
        return request();
      }
    },
    pull: () => {
      return this.ws.ready();
    },
    cancel: async () => {
      this.ws.removeEventListener("open", request);
      if (this.ws.readyState === WebSocket.OPEN) {
        await messenger.write(["CLOSE", sid]);
      }
      return messenger.close();
    },
  }, new CountQueuingStrategy({ highWaterMark: opts.nbuffer }));
};

Relay.prototype.publish = async function (event: NostrEvent): Promise<void> {
  const writer = this.getWriter();
  await writer.ready;

  // We don't await this because it blocks for a long time
  writer.write(["EVENT", event]);

  this.addEventListener(event.id, onMessage.bind(this));
};

type SubscriptionEvent = MessageEvent<
  Stringified<RelayToClientMessage<"EVENT" | "EOSE">>
>;

type SubscriptionEventListener = (
  this: Relay,
  ev: SubscriptionEvent,
  // deno-lint-ignore no-explicit-any
) => any;

type SubscriptionEventListenerObject = {
  handleEvent(
    this: Relay,
    ev: SubscriptionEvent,
    // deno-lint-ignore no-explicit-any
  ): any;
};

type OkMessageEvent = MessageEvent<Stringified<RelayToClientMessage<"OK">>>;

type OkMessageEventListener = (
  this: Relay,
  ev: OkMessageEvent,
  // deno-lint-ignore no-explicit-any
) => any;

type OkMessageEventListenerObject = {
  handleEvent(
    this: Relay,
    ev: OkMessageEvent,
    // deno-lint-ignore no-explicit-any
  ): any;
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
    EVENT: undefined,
  },
} satisfies RelayExtension;
