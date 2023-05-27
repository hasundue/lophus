import type { NostrMessage } from "../nips/01.ts";
import { LazyWebSocket, WebSocketEventHooks } from "./websockets.ts";
import {
  NonExclusiveReadableStream,
  NonExclusiveWritableStream,
} from "./streams.ts";
import { allof } from "./utils.ts";

/**
 * Common base class for relays and clients.
 */
export class NostrNode<R = NostrMessage, W = NostrMessage>
  extends NonExclusiveWritableStream<W> {
  protected ws: LazyWebSocket;

  #messages?: NonExclusiveReadableStream<R>;

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
    return this.#messages ??= new NonExclusiveReadableStream<R>({
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

  async send(msg: W): Promise<void> {
    const writer = this.getWriter();
    await writer.write(msg);
    await writer.close();
  }
}

export interface NostrNodeConfig {
  on?: WebSocketEventHooks;
  nbuffer?: number;
}
