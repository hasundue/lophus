import type {
  Relay,
  RelayToClientMessage,
  SignedEvent,
  SubscriptionFilter,
  SubscriptionId,
} from "../client.ts";
import { Notify } from "../core/x/async.ts";
import { distinctBy, merge } from "./streams.ts";

export interface SubscriptionOptions {
  id?: string;
  realtime?: boolean;
}

export class Subscription {
  readonly id: SubscriptionId;
  readonly realtime: boolean;

  #closed = new Notify();
  #relays: Relay[];
  #filters: SubscriptionFilter[];
  #provider: TransformStream<RelayToClientMessage, SignedEvent>;

  constructor(
    to: SubscriptionFilter | SubscriptionFilter[],
    from: Relay | Relay[],
    opts: SubscriptionOptions = {},
  ) {
    this.id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    this.realtime = opts.realtime ?? true;
    this.#relays = relays;
    this.#filters = [filter].flat();

    this.#provider = new TransformStream<RelayToClientMessage, SignedEvent>({
      transform: (msg, controller) => {
        if (msg[0] === "EVENT" && msg[1] === this.id) {
          controller.enqueue(msg[2]);
        }
        if (
          msg[0] === "EOSE" && msg[1] === this.id && !this.realtime
        ) {
          controller.terminate();
          this.#closed.notifyAll();
        }
      },
    });
  }

  get events(): ReadableStream<SignedEvent> {
    this.#relays.forEach((r) => r.send(["REQ", this.id, ...this.#filters]));
    return merge(
      this.#relays.map((r) => r.#messages.pipeThrough(this.#provider)),
    ).pipeThrough(distinctBy((ev) => ev.id));
  }

  async close() {
    await Promise.all(this.#relays.map((r) => r.send(["CLOSE", this.id])));
    this.#closed.notifyAll();
  }

  get closed() {
    return this.#closed.notified();
  }
}
