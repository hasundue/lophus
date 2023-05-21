import { Notify } from "./x/async.ts";

/**
 * A lazy WebSocket that creates a connection when it is needed.
 * It will also wait for the webSocket to be ready before sending any data.
 */
export class LazyWebSocket {
  #ws?: WebSocket;
  #notifier = new Notify();

  constructor(protected createWebSocket: () => WebSocket) {}

  protected ensureCreated(): WebSocket {
    if (this.#ws) return this.#ws;
    this.#ws = this.createWebSocket();
    this.#ws.addEventListener("open", () => this.#notifier.notify());
    this.#ws.addEventListener("close", () => this.#notifier.notify());
    return this.#ws;
  }

  protected async ensureReady(): Promise<WebSocket> {
    this.#ws = this.ensureCreated();

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
    return this.#ws;
  }

  async send(data: Parameters<WebSocket["send"]>[0]): Promise<void> {
    this.#ws = await this.ensureReady();
    this.#ws.send(data);
  }

  addEventListener<T extends keyof WebSocketEventMap>(
    type: T,
    listener: (this: WebSocket, ev: WebSocketEventMap[T]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ) {
    this.#ws = this.ensureCreated();
    this.#ws.addEventListener(type, listener, options);
  }
}

export type WebSocketEventHooks = {
  [K in keyof WebSocketEventMap]?: (event: WebSocketEventMap[K]) => void;
};
