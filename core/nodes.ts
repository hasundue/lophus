import type { NostrMessage } from "../nips/01.ts";
import { LazyWebSocket, WebSocketEventHooks } from "./websockets.ts";
import { push } from "./x/streamtools.ts";
import { allof } from "./utils.ts";

/**
 * Common base class for relays and clients.
 */
export class NostrNode<R = NostrMessage, W = NostrMessage>
  extends WritableStream<W> {
  protected ws: LazyWebSocket;

  #messages?: ReadableStream<R>;

  constructor(
    createWebSocket: () => WebSocket,
    protected config: NostrNodeConfig = {},
  ) {
    super({
      write: (msg) => this.ws.send(JSON.stringify(msg)),

      close: async () => {
        await allof(
          this.#messages?.cancel(),
          this.ws.close(),
        );
      },
    });

    this.ws = new LazyWebSocket(createWebSocket, config?.on ?? {});
  }

  get status() {
    return this.ws.status;
  }

  get connected() {
    return this.ws.ready;
  }

  get messages() {
    return this.#messages ?? new ReadableStream<R>({
      start: (con) => {
        this.ws.addEventListener("message", (ev) => {
          con.enqueue(JSON.parse(ev.data));
          if (con.desiredSize && con.desiredSize <= 0) {
            this.ws.close();
          }
        });
      },
      pull: () => this.ws.ready,
      cancel: () => this.ws.close(),
    }, new CountQueuingStrategy({ highWaterMark: this.config.nbuffer ?? 10 }));
  }

  async send(msg: W) {
    await push(this, msg);
  }

  async close() {
    await this.#messages?.cancel();
    await super.close();
  }
}

export interface NostrNodeConfig {
  on?: WebSocketEventHooks;
  nbuffer?: number;
}
