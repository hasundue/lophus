import { Notify } from "./x/async.ts";

/**
 * A lazy WebSocket that creates a connection when it is needed.
 * It will also wait for the webSocket to be ready before sending any data.
 */
export class LazyWebSocket extends EventTarget implements WebSocket {
  #ws?: WebSocket;
  #createWebSocket: () => WebSocket;
  #notifier = new Notify();

  constructor(
    url: string | URL,
    protocols?: string | string[],
  ) {
    super(); // EventTarget
    this.#createWebSocket = () => {
      const ws = new WebSocket(url, protocols);
      // Pass through events from the WebSocket
      for (const type of ["error", "message"] as const) {
        ws.addEventListener(type, (ev) => dispatchEvent.bind(this, ev));
      }
      for (const type of ["open", "close"] as const) {
        ws.addEventListener(type, () => this.#notifier.notify());
      }
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
    this.dispatchEvent(new Event("open"));
    return this.#ws;
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
    this.dispatchEvent(new Event("close"));
  }

  // --------------
  // WebSocket API
  // --------------
  set binaryType(value: BinaryType) {
    if (this.#ws) {
      this.#ws.binaryType = value;
    }
  }
  get bufferedAmount() {
    return this.#ws ? this.#ws.bufferedAmount : 0;
  }
  get extensions() {
    return this.#ws ? this.#ws.extensions : "";
  }
  get protocol() {
    return this.#ws ? this.#ws.protocol : "";
  }
  get readyState(): WebSocketReadyState {
    return this.#ws ? this.#ws.readyState : WebSocket.CLOSED;
  }
  readonly url: string;

  onclose: WebSocket["onclose"] = null;
  onerror: WebSocket["onerror"] = null;
  onmessage: WebSocket["onmessage"] = null;
  onopen: WebSocket["onopen"] = null;

  readonly CONNECTING = WebSocket.CONNECTING;
  readonly OPEN = WebSocket.OPEN;
  readonly CLOSING = WebSocket.CLOSING;
  readonly CLOSED = WebSocket.CLOSED;
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
