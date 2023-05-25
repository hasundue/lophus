import { Notify } from "./x/async.ts";

/**
 * A lazy WebSocket that creates a connection when it is needed.
 * It will also wait for the webSocket to be ready before sending any data.
 */
export class LazyWebSocket {
  #ws?: WebSocket;

  readonly notify = {
    open: new Notify(),
    close: new Notify(),
  };

  constructor(
    protected createWebSocket: () => WebSocket,
    protected on?: WebSocketEventHooks,
  ) {}

  protected created(): WebSocket {
    if (this.#ws) return this.#ws;

    this.#ws = this.createWebSocket();

    this.#ws.onopen = (ev) => {
      this.on?.open?.(ev);
      this.notify.open.notifyAll();
    };
    this.#ws.onclose = (ev) => {
      this.on?.close?.(ev);
      this.notify.close.notifyAll();
    };
    this.#ws.onerror = this.on?.error ?? null;

    return this.#ws;
  }

  protected async ready(): Promise<WebSocket> {
    this.#ws = this.created();

    switch (this.#ws.readyState) {
      case WebSocket.CONNECTING:
        await this.notify.open.notified();
        /* falls through */
      case WebSocket.OPEN:
        break;

      case WebSocket.CLOSING:
        await this.notify.close.notified();
        /* falls through */
      case WebSocket.CLOSED:
        this.#ws = this.createWebSocket();
        await this.notify.open.notified();
    }
    return this.#ws;
  }

  async send(data: Parameters<WebSocket["send"]>[0]): Promise<void> {
    this.#ws = await this.ready();
    this.#ws.send(data);
  }

  addEventListener<T extends keyof WebSocketEventMap>(
    type: T,
    listener: (this: WebSocket, ev: WebSocketEventMap[T]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ) {
    this.#ws = this.created();
    this.#ws.addEventListener(type, listener, options);
  }

  async close(code?: number, reason?: string): Promise<void> {
    if (!this.#ws || this.#ws.readyState === WebSocket.CLOSED) {
      return Promise.resolve();
    }
    if (this.#ws.readyState < WebSocket.CLOSING) {
      this.#ws.close(code, reason);
    }
    await this.notify.close.notified();
  }
}

export type WebSocketEventHooks = {
  [K in keyof Omit<WebSocketEventMap, "message">]?: (
    ev: WebSocketEventMap[K],
  ) => void;
};
