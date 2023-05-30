import type { NostrMessage } from "../nips/01.ts";
import { LazyWebSocket, WebSocketEventHooks } from "./websockets.ts";
import {
  NonExclusiveReadableStream,
  NonExclusiveWritableStream,
} from "./streams.ts";

/**
 * Common base class for relays and clients.
 */
export class NostrNode<R = NostrMessage, W = NostrMessage>
  extends NonExclusiveWritableStream<W> {
  readonly config: Readonly<NostrNodeConfig>;
  protected ws: LazyWebSocket;

  #messages?: NonExclusiveReadableStream<R>;

  constructor(
    createWebSocket: () => WebSocket,
    config: Partial<NostrNodeConfig> = {},
  ) {
    super({
      write: (msg) => this.ws.send(JSON.stringify(msg)),

      close: async () => {
        await this.#messages?.cancel();
        await this.ws.close();
      },
    });

    this.config = { nbuffer: 10, ...config };
    this.ws = new LazyWebSocket(createWebSocket, config);
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
    }, new CountQueuingStrategy({ highWaterMark: this.config.nbuffer }));
  }
}

export type NostrNodeConfig = {
  nbuffer: number;
} & Partial<WebSocketEventHooks>;
