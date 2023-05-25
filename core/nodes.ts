import type { NostrMessage } from "../nips/01.ts";
import { LazyWebSocket, WebSocketEventHooks } from "./websockets.ts";
import { push } from "./x/streamtools.ts";

/**
 * Common base class for relays and clients.
 */
export class NostrNode<R = NostrMessage, W = NostrMessage>
  extends WritableStream<W> {
  #ws: LazyWebSocket;
  #messages?: ReadableStream<R>;

  protected readonly notify;

  constructor(
    createWebSocket: () => WebSocket,
    protected config: NostrNodeConfig = {},
  ) {
    super({
      write: (msg) => this.#ws.send(JSON.stringify(msg)),

      close: async () => {
        await Promise.all([
          this.#messages?.cancel(),
          this.#ws.close(),
        ]);
      },
    });

    this.#ws = new LazyWebSocket(createWebSocket, config?.on ?? {});

    this.notify = {
      ws: this.#ws.notify,
    };
  }

  get messages() {
    return this.#messages ?? new ReadableStream<R>({
      start: (con) => {
        this.#ws.addEventListener("message", (ev) => {
          con.enqueue(JSON.parse(ev.data));
          if (con.desiredSize && con.desiredSize <= 0) {
            this.#ws.close(1009); // use the 'message is too big' code
          }
        });
      },
      pull: () => this.#ws.ready,
      cancel: () => this.#ws.close(),
    }, new CountQueuingStrategy({ highWaterMark: this.config.nbuffer ?? 10 }));
  }

  async send(msg: W) {
    await push(this, msg);
  }
}

export interface NostrNodeConfig {
  on?: WebSocketEventHooks;
  nbuffer?: number;
}
