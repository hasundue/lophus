import type {
  ClientToRelayMessage,
  EoseMessage,
  EventId,
  EventKind,
  EventMessage,
  NostrEvent,
  OkMessage,
  RelayToClientMessage,
  RelayUrl,
  SubscriptionFilter,
  SubscriptionId,
} from "./core/types.ts";
import { NostrNode, NostrNodeConfig } from "./core/nodes.ts";
import { NonExclusiveWritableStream } from "./core/streams.ts";
import { LazyWebSocket } from "./core/websockets.ts";
import { Lock } from "./core/x/async.ts";

export * from "./core/nips/01.ts";

/**
 * A class that represents a remote Nostr Relay.
 */
export class Relay extends NostrNode<ClientToRelayMessage> {
  declare ws: LazyWebSocket;
  readonly config: Readonly<RelayConfig>;

  readonly #subs = new Map<
    SubscriptionId,
    Lock<WritableStreamDefaultWriter<EventMessage | EoseMessage>>
  >();

  readonly #published = new Map<EventId, PromiseResolveCallback<OkMessage>>();

  constructor(
    init: RelayUrl | RelayInit,
    opts?: RelayOptions,
  ) {
    const url = typeof init === "string" ? init : init.url;
    super( // new NostrNode(
      new LazyWebSocket(url),
      { nbuffer: 10, ...opts },
    );
    // deno-fmt-ignore
    this.config = {
      url, name: url.slice(6).split("/")[0],
      read: true, write: true, nbuffer: 10, ...opts,
    };
    this.ws.addEventListener("message", (ev: MessageEvent<string>) => {
      // TODO: Validate message.
      const msg = JSON.parse(ev.data) as RelayToClientMessage;
      const type = msg[0];

      // TODO: Apply backpressure when a queue is full.

      if (type === "NOTICE") {
        // TODO: Should we have a dedicated ReadableStream for this?
        const body = msg[1];
        return opts?.logger?.info?.(type, this.config.name, body);
      }
      if (type === "OK") {
        const [, eid] = msg;
        const resolve = this.#published.get(eid);
        if (!resolve) {
          opts?.logger?.warn?.(type, this.config.name, "Unknown event id");
          return;
        }
        return resolve(msg);
      }
      if (type === "EVENT" || type === "EOSE") {
        const [, sid] = msg;
        return this._notify(sid, msg);
      }
      opts?.logger?.warn?.(type, this.config.name, "Unknown message type");
    });
  }

  subscribe<K extends EventKind>(
    filter: SubscriptionFilter<K> | SubscriptionFilter<K>[],
    opts: Partial<SubscriptionOptions> = {},
  ): ReadableStream<NostrEvent<K>> {
    const sid = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    opts.realtime ??= true;
    opts.nbuffer ??= this.config.nbuffer;

    const messenger = this.getWriter();
    let controllerLock: Lock<ReadableStreamDefaultController<NostrEvent<K>>>;

    const writable = new NonExclusiveWritableStream<
      EventMessage<K> | EoseMessage
    >({
      write: (msg): Promise<void> | undefined => {
        const type = msg[0];
        switch (type) {
          case "EVENT": {
            const [, , event] = msg;
            this.config.logger?.debug?.(type, this.config.name, event);
            return controllerLock.lock((cnt) => cnt.enqueue(event));
          }
          case "EOSE":
            this.config.logger?.debug?.(type, this.config.name, sid);
            if (opts.realtime) {
              return;
            }
            return controllerLock.lock((cnt) => cnt.close());
          default:
            this.config.logger?.warn?.(
              type,
              this.config.name,
              "Unknown message type",
            );
        }
      },
      close() {
        return controllerLock.lock((cnt) => cnt.close());
      },
    }, new CountQueuingStrategy({ highWaterMark: opts.nbuffer }));

    this.#subs.set(sid, new Lock(writable.getWriter()));

    const request = () => messenger.write(["REQ", sid, ...[filter].flat()]);

    return new ReadableStream<NostrEvent<K>>({
      start: (controller) => {
        controllerLock = new Lock(controller);
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
        await messenger.close();
      },
    }, new CountQueuingStrategy({ highWaterMark: 0 }));
  }

  async publish(event: NostrEvent): Promise<void> {
    const writer = this.getWriter();
    await writer.ready;
    await writer.write(["EVENT", event]);
    writer.releaseLock();
    const [, , accepted, body] = await new Promise<OkMessage>((resolve) => {
      this.#published.set(event.id, resolve);
    });
    if (!accepted) {
      throw new Error(`Event rejected: ${body}`, { cause: event });
    }
    this.config.logger?.info?.("OK", this.config.name, body);
  }

  async close() {
    await Promise.all(
      Array.from(this.#subs.values()).map((sub) =>
        sub.lock((writer) => writer.close())
      ),
    );
    await super.close();
  }

  private async _notify(
    sid: SubscriptionId,
    msg: EventMessage | EoseMessage,
  ) {
    const messenger = new Lock(this.getWriter());
    const sub = this.#subs.get(sid);
    const promise = sub
      ? sub.lock((writer) => writer.write(msg))
      // Subscription is already closed. TODO: should we throw an error?
      : messenger.lock((writer) => writer.write(["CLOSE", sid]));
    await promise.catch((err) => {
      if (err instanceof TypeError) {
        // Stream is already closing or closed.
        return;
      }
      throw err;
    });
  }
}

export type RelayConfig = NostrNodeConfig & {
  url: RelayUrl;
  name: string;
  read: boolean;
  write: boolean;
};

export type RelayOptions = Partial<RelayConfig>;

export type RelayInit = {
  url: RelayUrl;
} & RelayOptions;

export type SubscriptionOptions = {
  id: string;
  realtime: boolean;
  nbuffer: number;
};

export interface RelayLike
  extends NonExclusiveWritableStream<ClientToRelayMessage> {
  subscribe: Relay["subscribe"];
}

type PromiseResolveCallback<T> = (value: T | PromiseLike<T>) => void;
