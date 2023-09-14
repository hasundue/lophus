import { Notify } from "./x/async.ts";

export interface WebSocketLike {
  readonly url: string;
  readonly readyState: WebSocketReadyState;
  send(
    data: string | ArrayBufferLike | Blob | ArrayBufferView,
  ): void | Promise<void>;
  close(code?: number, reason?: string): void | Promise<void>;
  addEventListener: WebSocket["addEventListener"];
  removeEventListener: WebSocket["removeEventListener"];
  dispatchEvent: WebSocket["dispatchEvent"];
}

/**
 * A lazy WebSocket that creates a connection when it is needed.
 * It will also wait for the webSocket to be ready before sending any data.
 */
export class LazyWebSocket implements WebSocketLike {
  #ws?: WebSocket;
  #createWebSocket: () => WebSocket;

  readonly #notifier = new Notify();
  readonly #addEventListenerMap = new Map<
    EventListenerOrEventListenerObject,
    () => ReturnType<WebSocket["addEventListener"]>
  >();

  constructor(
    url: string | URL,
    protocols?: string | string[],
  ) {
    this.#createWebSocket = () => {
      const ws = new WebSocket(url, protocols);
      ws.addEventListener("open", () => {
        this.#notifier.notifyAll();
        this.#addEventListenerMap.forEach((callback) => callback());
      });
      return ws;
    };
    this.url = url.toString();
  }

  #created(): WebSocket {
    return this.#ws ??= this.#createWebSocket();
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
        this.#ws = this.#createWebSocket();
        await this.#notifier.notified();
    }
    return this.#ws;
  }

  async ready(): Promise<void> {
    await this.#ready();
  }

  async send(data: Parameters<WebSocket["send"]>[0]): Promise<void> {
    this.#ws = await this.#ready();
    this.#ws.send(data);
  }

  close(code?: number, reason?: string): void {
    this.#ws?.close(code, reason);
    this.#ws = undefined;
  }

  get readyState(): WebSocketReadyState {
    return this.#ws ? this.#ws.readyState : WebSocket.CLOSED;
  }
  readonly url: string;

  addEventListener: WebSocket["addEventListener"] = (
    type: keyof WebSocketEventMap,
    listener: EventListenerOrEventListenerObject,
    options: boolean | AddEventListenerOptions = {},
  ) => {
    const callback = () => this.#ws?.addEventListener(type, listener, options);
    if (this.#ws?.readyState === WebSocket.OPEN) {
      callback();
    }
    this.#addEventListenerMap.set(listener, callback);
  };

  removeEventListener: WebSocket["removeEventListener"] = (
    type: keyof WebSocketEventMap,
    listener: EventListenerOrEventListenerObject,
    options: boolean | EventListenerOptions = {},
  ) => {
    this.#ws?.removeEventListener(type, listener, options);
    this.#addEventListenerMap.delete(listener);
  };

  dispatchEvent: WebSocket["dispatchEvent"] = (event: Event) => {
    return this.#ws?.dispatchEvent(event) ?? false;
  };
}

/**
 * The ready state of a WebSocket.
 */
export enum WebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}
