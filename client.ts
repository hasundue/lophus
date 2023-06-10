import type {
  ClientToRelayMessage,
  EoseMessage,
  EventKind,
  EventMessage,
  NostrEvent,
  NoticeBody,
  RelayToClientMessage,
  RelayUrl,
  SubscriptionFilter,
  SubscriptionId,
} from "./core/types.ts";
import { NostrNode, NostrNodeConfig } from "./core/nodes.ts";
import { NonExclusiveWritableStream } from "./core/streams.ts";
import { Lock } from "./core/x/async.ts";

export * from "./core/nips/01.ts";

/**
 * A class that represents a remote Nostr Relay.
 */
export class Relay extends NostrNode<ClientToRelayMessage> {
  readonly config: Readonly<RelayConfig>;

  readonly #subs = new Map<
    SubscriptionId,
    Lock<WritableStreamDefaultWriter<EoseMessage | EventMessage>>
  >();

  constructor(
    init: RelayUrl | RelayInit,
    opts?: RelayOptions,
  ) {
    const url = typeof init === "string" ? init : init.url;

    super( // new NostrNode(
      () => new WebSocket(url),
      { nbuffer: 10, ...opts },
    );

    // deno-fmt-ignore
    this.config = {
      url, name: url.slice(6).split("/")[0],
      read: true, write: true, nbuffer: 10, ...opts,
    };

    const messenger = new Lock(this.getWriter());

    this.ws.addEventListener("message", (ev: MessageEvent<string>) => {
      const msg = JSON.parse(ev.data) as RelayToClientMessage;

      // TODO: Apply backpressure when a queue is full.

      if (msg[0] === "NOTICE") {
        return opts?.onNotice?.(msg[1]);
      }
      const sub = this.#subs.get(msg[1]);

      const promise = sub
        ? sub.lock((writer) => writer.write(msg))
        : messenger.lock((writer) => writer.write(["CLOSE", msg[1]]));

      return promise.catch((err) => {
        if (err instanceof TypeError) {
          // Stream is already closing or closed.
          return;
        }
        throw err;
      });
    });
  }

  subscribe<K extends EventKind>(
    filter: SubscriptionFilter<K> | SubscriptionFilter<K>[],
    opts: Partial<SubscriptionOptions> = {},
  ): ReadableStream<NostrEvent<K>> {
    const id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    opts.realtime ??= true;
    opts.nbuffer ??= this.config.nbuffer;

    const messenger = this.getWriter();
    const aborter = new AbortController();

    let controllerLock: Lock<ReadableStreamDefaultController<NostrEvent<K>>>;

    this.#subs.set(
      id,
      new Lock(
        new NonExclusiveWritableStream<EoseMessage | EventMessage<K>>({
          write([kind, _, event]) {
            switch (kind) {
              case "EOSE":
                if (opts.realtime) return;
                return controllerLock.lock((cnt) => cnt.close());
              case "EVENT":
                return controllerLock.lock((cnt) => cnt.enqueue(event));
            }
          },
          close() {
            return controllerLock.lock((cnt) => cnt.close());
          },
        }, new CountQueuingStrategy({ highWaterMark: opts.nbuffer }))
          .getWriter(),
      ),
    );

    const request = () => messenger.write(["REQ", id, ...[filter].flat()]);

    return new ReadableStream<NostrEvent<K>>({
      start: (controller) => {
        controllerLock = new Lock(controller);

        this.ws.addEventListener("open", request, { signal: aborter.signal });

        if (this.ws.status === WebSocket.OPEN) {
          return request();
        }
      },
      pull: () => {
        return this.connected;
      },
      async cancel() {
        aborter.abort();

        await messenger.write(["CLOSE", id]);
        messenger.close();
      },
    }, new CountQueuingStrategy({ highWaterMark: 0 }));
  }

  override async close() {
    await Promise.all(
      Array.from(this.#subs.values()).map((sub) =>
        sub.lock((writer) => writer.close())
      ),
    );
    await super.close();
  }
}

export type RelayConfig = NostrNodeConfig & {
  url: RelayUrl;
  name: string;
  read: boolean;
  write: boolean;
  onNotice?: (notice: NoticeBody) => void | Promise<void>;
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
