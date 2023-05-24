import type { NostrMessage } from "../nips/01.ts";
import { WebSocketEventHooks, LazyWebSocket } from "./websockets.ts";
import {
  broadcast,
  createDwReadableStream,
  DwStreamWatermarks,
} from "./streams.ts";
import { push } from "./x/streamtools.ts";

/**
 * Internal messages which are not part of the Nostr protocol.
 */
export type InternalMessage = RestartMessage;
export type RestartMessage = ["RESTART"];

export type MessageBufferConfig = DwStreamWatermarks;

export interface NostrNodeConfig {
  buffer: DwStreamWatermarks;
  on?: WebSocketEventHooks;
}

/**
 * Common base class for relays and clients.
 */
export class NostrNode<R extends NostrMessage, W extends NostrMessage> {
  #ws: LazyWebSocket;

  #channels: WritableStream<R | InternalMessage>[] = [];

  constructor(
    createWebSocket: () => WebSocket,
    config: NostrNodeConfig,
  ) {
    this.#ws = new LazyWebSocket(createWebSocket, config.on ?? {});

    const messages = createDwReadableStream<R | InternalMessage>({
      start: (controller) => {
        this.#ws.addEventListener("message", (ev) => {
          const msg = JSON.parse(ev.data) as R;
          controller.enqueue(msg);
        });
        this.#ws.addEventListener("close", () => {
          controller.enqueue(["RESTART"]);
        });
      },
      stop: async () => {
        // TODO: let other listeners wait until restart?
        await this.#ws.close();
      },
      restart: (controller) => {
        // TODO: notify other listeners?
        controller.enqueue(["RESTART"]);
      },
    }, config.buffer);

    broadcast(messages, this.#channels, "any");
  }

  protected channel(writable: WritableStream<R | InternalMessage>) {
    this.#channels.push(writable);
  }

  protected unchannel(writable: WritableStream<R | InternalMessage>) {
    this.#channels = this.#channels.filter((w) => w !== writable);
  }

  send(msg: W): Promise<void> {
    return push(this.messenger, msg);
  }

  readonly messenger = new WritableStream<W>({
    write: (msg) => this.#ws.send(JSON.stringify(msg)),
  });

  close(): Promise<void> {
    return this.#ws.close();
  }
}
