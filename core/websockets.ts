import { entries } from "./utils.ts";
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
    protected on: WebSocketEventHooks,
  ) {}

  protected ensureCreated(): WebSocket {
    if (this.#ws) return this.#ws;

    this.#ws = this.createWebSocket();

    this.#ws.onopen = (ev) => {
      this.on?.open?.(ev);
      this.#notifier.notify();
    };
    this.#ws.onclose = (ev) => {
      this.on?.close?.(ev);
      this.#notifier.notify();
    };
    this.#ws.onerror = this.on?.error ?? null;

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

  async close(): Promise<void> {
    if (!this.#ws || this.#ws.readyState === WebSocket.CLOSED) {
      return Promise.resolve();
    }
    if (this.#ws.readyState < WebSocket.CLOSING) {
      this.#ws.close();
    }
    await this.#notifier.notified();
  }
}

export type WebSocketEventHooks = {
  [K in keyof Omit<WebSocketEventMap, "message">]?: (
    ev: WebSocketEventMap[K],
  ) => void;
};

export function assignEventHooks(
  ws: WebSocket,
  hooks: WebSocketEventHooks,
): void {
  for (const hook of entries(hooks)) {
    assignEventHook(ws, hook);
  }
}

function assignEventHook<T extends keyof WebSocketEventHooks>(
  ws: WebSocket,
  hook: [T, WebSocketEventHooks[T]],
) {
  if (hook[1]) ws.addEventListener(hook[0], hook[1].bind(ws));
}
