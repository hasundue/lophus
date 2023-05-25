import type { NostrMessage } from "../nips/01.ts";
import type { Brand } from "./types.ts";
import { LazyWebSocket, WebSocketEventHooks } from "./websockets.ts";
import {
  broadcast,
  createDualMarkReadableStream,
  DualMarkStreamWatermarks,
} from "./streams.ts";

/**
 * Internal messages which are not part of the Nostr protocol.
 */
export type InternalMessage = RestartMessage;
export type RestartMessage = ["RESTART"];

export type ChannelId = Brand<string, "ChannelId">;

export interface ChannelOptions {
  id?: ChannelId;
}

export type MessageBufferConfig = DualMarkStreamWatermarks;

export interface NostrNodeConfig {
  buffer: DualMarkStreamWatermarks;
  on?: WebSocketEventHooks;
}

/**
 * Common base class for relays and clients.
 */
export class NostrNode<
  R extends NostrMessage = NostrMessage,
  W extends NostrMessage = NostrMessage,
> {
  #ws: LazyWebSocket;

  #chs?: WritableStream<R | InternalMessage>[];
  #chs_map = new Map<ChannelId, WritableStream<R | InternalMessage>>();

  constructor(
    createWebSocket: () => WebSocket,
    protected config: NostrNodeConfig,
  ) {
    this.#ws = new LazyWebSocket(createWebSocket, config.on ?? {});
  }

  protected get channels() {
    if (this.#chs) return this.#chs;

    this.#chs = [];

    const msgs = createDualMarkReadableStream<R | InternalMessage>({
      start: (cnt) => {
        this.#ws.addEventListener("message", (ev) => {
          const msg = JSON.parse(ev.data) as R;
          cnt.enqueue(msg);
        });
        this.#ws.addEventListener("close", () => {
          cnt.enqueue(["RESTART"]);
        });
      },
      stop: async () => {
        // TODO: let other listeners wait until restart?
        await this.#ws.close();
      },
      restart: (cnt) => {
        // TODO: notify other listeners?
        cnt.enqueue(["RESTART"]);
      },
    }, this.config.buffer);

    broadcast(msgs, this.#chs, "any");

    return this.#chs;
  }

  protected channel(
    writable: WritableStream<R | InternalMessage>,
    opts?: ChannelOptions,
  ): ChannelId {
    this.channels.push(writable);

    const id = opts?.id ?? crypto.randomUUID() as ChannelId;
    this.#chs_map.set(id, writable);

    return id;
  }

  protected async unchannel(id: ChannelId) {
    this.#chs_map.delete(id);
    this.#chs = Array.from(this.#chs_map.values());

    if (this.#chs.length === 0) {
      await this.#ws.close();
    }
  }

  send(msg: W): Promise<void> {
    return this.#ws.send(JSON.stringify(msg));
  }

  readonly messenger = new WritableStream<W>({
    write: (msg) => this.send(msg),
  });

  close(): Promise<void> {
    return this.#ws.close();
  }
}
