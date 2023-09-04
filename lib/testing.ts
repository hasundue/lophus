export class MockWebSocket implements WebSocket {
  CONNECTING = WebSocket.CONNECTING;
  OPEN = WebSocket.OPEN;
  CLOSING = WebSocket.CLOSING;
  CLOSED = WebSocket.CLOSED;

  binaryType: "blob" | "arraybuffer" = "blob";
  readonly bufferedAmount: number = 0;
  readonly extensions: string = "";
  readonly protocol: string = "";

  #readyState: number = WebSocket.OPEN;
  get readyState(): number {
    return this.#readyState;
  }

  readonly url: string = "";

  readonly close: (code?: number, reason?: string) => void;
  readonly send: (
    data: string | ArrayBufferLike | Blob | ArrayBufferView,
  ) => void;

  constructor(
    onclosed?: (code?: number, reason?: string) => void,
    onsent?: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void,
  ) {
    this.close = (code?: number, reason?: string) => {
      return onclosed?.(code, reason);
    };
    this.send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
      return onsent?.(data);
    };
  }

  onclose: ((this: WebSocket, ev: CloseEvent) => void) | null = null;
  onerror: ((this: WebSocket, ev: Event) => void) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => void) | null = null;
  onopen: ((this: WebSocket, ev: Event) => void) | null = null;

  addEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject | null,
    _options?: boolean | AddEventListenerOptions,
  ): void {
    throw new Error("Method not implemented.");
  }
  removeEventListener(
    _type: string,
    _callback: EventListenerOrEventListenerObject | null,
    _options?: EventListenerOptions | boolean,
  ): void {
    throw new Error("Method not implemented.");
  }
  dispatchEvent(_event: Event): boolean {
    throw new Error("Method not implemented.");
  }
}
