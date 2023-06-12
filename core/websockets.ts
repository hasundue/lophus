import { Logger } from "./types.ts";
import { Notify } from "./x/async.ts";

/**
 * A lazy WebSocket that creates a connection when it is needed.
 * It will also wait for the webSocket to be ready before sending any data.
 */
export class LazyWebSocket {
  #ws?: WebSocket;
  #notifier = new Notify();

  // Callbacks to add event listeners to the WebSocket.
  #inits = new Set<(ws: WebSocket) => void>();

  constructor(
    protected createWebSocket: () => WebSocket,
    protected logger?: Logger,
  ) {
    for (const event of ["open", "close"] as const) {
      this.#inits.add((ws) =>
        ws.addEventListener(event, (): void => {
          this.logger?.debug?.(`[ws] ${event}`);
          this.#notifier.notifyAll();
        })
      );
    }
  }

  #created(): WebSocket {
    if (this.#ws) return this.#ws;

    this.#ws = this.createWebSocket();
    this.#inits.forEach((addEventListener) => addEventListener(this.#ws!));

    this.logger?.debug?.("[ws] created");

    return this.#ws;
  }

  async #ready(): Promise<WebSocket> {
    this.#ws = this.#created();

    switch (this.#ws.readyState) {
      case WebSocket.CONNECTING:
        await this.#notifier.notified();
        /* falls through */
      case WebSocket.OPEN:
        break;

      case WebSocket.CLOSING:
        await this.#notifier.notified();
        /* falls through */
      case WebSocket.CLOSED:
        this.#ws = this.createWebSocket();
        await this.#notifier.notified();
    }

    this.logger?.debug?.("[ws] ready");

    return this.#ws;
  }

  get ready(): Promise<void> {
    return this.#ready().then(() => {});
  }

  get status(): WebSocketReadyState {
    return this.#ws?.readyState ?? WebSocket.CLOSED;
  }

  async send(data: Parameters<WebSocket["send"]>[0]): Promise<void> {
    this.#ws = await this.#ready();
    this.logger?.debug?.("[ws] send", data);
    this.#ws.send(data);
  }

  addEventListener<T extends keyof WebSocketEventMap>(
    type: T,
    listener: (this: WebSocket, ev: WebSocketEventMap[T]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ) {
    this.logger?.debug?.("[ws] listen", type);

    this.#ws?.addEventListener(type, listener, options);

    const cb = (ws: WebSocket) => ws.addEventListener(type, listener, options);
    this.#inits.add(cb);

    if (typeof options === "object" && options.signal) {
      options.signal.addEventListener("abort", () => {
        this.logger?.debug?.("[ws] unlisten", type);
        this.#inits.delete(cb);
        this.#ws?.removeEventListener(type, listener, options);
      });
    }
  }

  async close(code?: number, reason?: string): Promise<void> {
    if (!this.#ws) return;

    switch (this.#ws.readyState) {
      case WebSocket.CONNECTING:
        await this.#notifier.notified();
        /* falls through */
      case WebSocket.OPEN:
        this.#ws.close(code, reason);
        /* falls through */
      case WebSocket.CLOSING:
        await this.#notifier.notified();
        /* falls through */
      case WebSocket.CLOSED:
        return;
    }
  }
}

export enum WebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}
