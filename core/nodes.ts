import type { NostrMessage } from "../nips/01.ts";
import { Notify } from "../core/x/async.ts";
import { LazyWebSocket, WebSocketEventHooks } from "./websockets.ts";

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
      msg: { pull: new Notify() },
    };
  }

  get messages() {
    return this.#messages ?? new ReadableStream<R>({
      start: (controller) => {
        this.#ws.addEventListener("message", (ev) => {
          controller.enqueue(JSON.parse(ev.data));
          if (controller.desiredSize && controller.desiredSize <= 0) {
            this.#ws.close();
          }
        });
      },
      pull: () => this.notify.msg.pull.notifyAll(),
      cancel: () => this.#ws.close(),
    }, new CountQueuingStrategy({ highWaterMark: this.config.nbuffer ?? 10 }));
  }
}

export interface NostrNodeConfig {
  on?: WebSocketEventHooks;
  nbuffer?: number;
}
