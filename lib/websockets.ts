export type WebSocketEventType = keyof WebSocketEventMap;

export interface WebSocketLike {
  readonly url: string;
  readonly readyState: WebSocket["readyState"];
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
  readonly #ac = new AbortController();
  readonly #createWebSocket: () => WebSocket;
  readonly #listeners = new Set<Parameters<WebSocket["addEventListener"]>>();
  readonly url: string;

  constructor(
    url: string | URL,
    protocols?: string | string[],
  ) {
    this.#createWebSocket = () => {
      const ws = new WebSocket(url, protocols);
      this.#listeners.forEach((args) => ws.addEventListener(...args));
      return ws;
    };
    this.url = url.toString();
  }

  #created(): WebSocket {
    return this.#ws ??= this.#createWebSocket();
  }

  #once(type: WebSocketEventType): Promise<void> {
    return new Promise<void>((resolve) => {
      this.#created().addEventListener(type, () => resolve(), { once: true });
    });
  }

  async #ready(): Promise<WebSocket> {
    this.#ws = this.#created();
    switch (this.#ws.readyState) {
      case WebSocket.CONNECTING:
        break;
      case WebSocket.OPEN:
        return this.#ws;
      case WebSocket.CLOSING:
        await this.#once("close");
        /* falls through */
      case WebSocket.CLOSED:
        this.#ws = this.#createWebSocket();
    }
    await this.#once("open");
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
    this.#ac.abort();
    switch (this.#ws.readyState) {
      case WebSocket.CONNECTING:
        await this.#once("open");
        /* falls through */
      case WebSocket.OPEN:
        this.#ws.close(code, reason);
        /* falls through */
      case WebSocket.CLOSING:
        await this.#once("close");
        /* falls through */
      case WebSocket.CLOSED:
        break;
    }
    this.#ws = undefined;
  }

  get readyState(): WebSocket["readyState"] {
    return this.#ws ? this.#ws.readyState : WebSocket.CLOSED;
  }

  addEventListener: WebSocket["addEventListener"] = (
    type: keyof WebSocketEventMap,
    listener: EventListenerOrEventListenerObject,
    options: boolean | AddEventListenerOptions = {},
  ) => {
    options = typeof options === "boolean" ? { capture: options } : options;
    options.signal = options.signal ?? this.#ac.signal;
    this.#ws?.addEventListener(type, listener, options);
    this.#listeners.add([type, listener, options]);
  };

  removeEventListener: WebSocket["removeEventListener"] = (
    type: keyof WebSocketEventMap,
    listener: EventListenerOrEventListenerObject,
    options: boolean | EventListenerOptions = {},
  ) => {
    this.#ws?.removeEventListener(type, listener, options);
    this.#listeners.delete([type, listener, options]);
  };

  dispatchEvent: WebSocket["dispatchEvent"] = (event: Event) => {
    return this.#ws?.dispatchEvent(event) ?? false;
  };
}
