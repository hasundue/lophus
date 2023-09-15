import { Notify } from "./x/async.ts";

export type WebSocketEventType = keyof WebSocketEventMap;

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

type EventListenerOptionsMap = Map<
  EventListenerOrEventListenerObject,
  boolean | AddEventListenerOptions | undefined
>;

/**
 * A lazy WebSocket that creates a connection when it is needed.
 * It will also wait for the webSocket to be ready before sending any data.
 */
export class LazyWebSocket implements WebSocketLike {
  #ws?: WebSocket;
  #createWebSocket: () => WebSocket;

  readonly #eventListenerMap = new Map<
    WebSocketEventType,
    EventListenerOptionsMap
  >();
  readonly #notifier = new Notify();

  readonly url: string;

  constructor(
    url: string | URL,
    protocols?: string | string[],
  ) {
    this.#createWebSocket = () => {
      const ws = new WebSocket(url, protocols);
      ws.addEventListener("open", () => {
        this.#notifier.notifyAll();
      });
      this.#eventListenerMap.forEach((map, type) => {
        map.forEach((options, listener) => {
          ws.addEventListener(type, listener, options);
        });
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

  async close(code?: number, reason?: string): Promise<void> {
    if (!this.#ws) {
      return;
    }
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
        break;
    }
    this.#ws = undefined;
  }

  get readyState(): WebSocketReadyState {
    return this.#ws ? this.#ws.readyState : WebSocket.CLOSED;
  }

  addEventListener: WebSocket["addEventListener"] = (
    type: keyof WebSocketEventMap,
    listener: EventListenerOrEventListenerObject,
    options: boolean | AddEventListenerOptions = {},
  ) => {
    this.#ws?.addEventListener(type, listener, options);
    const map = this.#eventListenerMap.get(type);
    if (map) {
      map.set(listener, options);
    } else {
      this.#eventListenerMap.set(type, new Map([[listener, options]]));
    }
  };

  removeEventListener: WebSocket["removeEventListener"] = (
    type: keyof WebSocketEventMap,
    listener: EventListenerOrEventListenerObject,
    options: boolean | EventListenerOptions = {},
  ) => {
    this.#ws?.removeEventListener(type, listener, options);
    this.#eventListenerMap.get(type)?.delete(listener);
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
