import { Notify } from "./x/async.ts";

/**
 * A lazy WebSocket that creates a connection when it is needed.
 * It will also wait for the webSocket to be ready before sending any data.
 */
export class LazyWebSocket {
  #ws?: WebSocket;

  #notifier = new Notify();

  constructor(
    protected createWebSocket: () => WebSocket,
    protected on?: WebSocketEventHooks,
  ) {}

  #created(): WebSocket {
    if (this.#ws) return this.#ws;

    this.#ws = this.createWebSocket();

    this.#ws.onopen = (ev) => {
      this.on?.open?.(ev);
      this.#notifier.notifyAll();
    };
    this.#ws.onclose = (ev) => {
      this.on?.close?.(ev);
      this.#notifier.notifyAll();
    };
    this.#ws.onerror = this.on?.error ?? null;

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
    this.#ws.send(data);
  }

  addEventListener<T extends keyof WebSocketEventMap>(
    type: T,
    listener: (this: WebSocket, ev: WebSocketEventMap[T]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ) {
    this.#ws = this.#created();
    this.#ws.addEventListener(type, listener, options);
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

export type WebSocketEventHooks = {
  [K in keyof Omit<WebSocketEventMap, "message">]?: (
    ev: WebSocketEventMap[K],
  ) => void;
};

export enum WebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}
