import type {
  ClientToRelayMessage,
  NostrEvent,
  NoticeBody,
  RelayToClientMessage,
  RelayUrl,
  SubscriptionFilter,
  SubscriptionId,
} from "./nips/01.ts";
import { NostrNode, NostrNodeConfig } from "./core/nodes.ts";

export * from "./nips/01.ts";

/**
 * A class that represents a remote Nostr Relay.
 */
export class Relay
  extends NostrNode<RelayToClientMessage, ClientToRelayMessage> {
  readonly config: Readonly<RelayConfig>;

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

    if (opts?.onNotice) {
      this.messages.pipeTo(
        new WritableStream({
          write(msg) {
            if (msg[0] === "NOTICE") {
              return opts.onNotice!(msg[1]);
            }
          },
        }),
      );
    }
  }

  subscribe(
    filter: SubscriptionFilter | SubscriptionFilter[],
    opts: Partial<SubscriptionOptions> = {},
  ): ReadableStream<NostrEvent> {
    const id = (opts.id ?? crypto.randomUUID()) as SubscriptionId;
    opts.realtime ??= true;
    opts.nbuffer ??= this.config.nbuffer;

    const messenger = this.getWriter();

    async function terminate(
      controller: TransformStreamDefaultController<NostrEvent>,
    ) {
      await messenger.write(["CLOSE", id]);
      messenger.releaseLock();
      return controller.terminate();
    }

    return this.messages.pipeThrough(
      new TransformStream<RelayToClientMessage, NostrEvent>({
        start() {
          return messenger.write(["REQ", id, ...[filter].flat()]);
        },
        transform(msg, controller) {
          if (msg[1] === id) {
            if (msg[0] === "EOSE" && !opts.realtime) {
              return terminate(controller);
            }
            if (msg[0] === "EVENT") {
              return controller.enqueue(msg[2]);
            }
          }
        },
        flush(controller) {
          return terminate(controller);
        },
      }),
    );
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

export type RelayLike = Omit<Relay, "config">;
