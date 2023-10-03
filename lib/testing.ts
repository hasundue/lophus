type MessageEventData = string | ArrayBufferLike | Blob | ArrayBufferView;

export class MockWebSocket extends EventTarget implements WebSocket {
  static get instances(): MockWebSocket[] {
    return this.#instances;
  }
  static #instances: MockWebSocket[] = [];

  constructor(url?: string | URL, protocols?: string | string[]) {
    super();
    this.url = url?.toString() ?? "";
    this.protocol = protocols ? [...protocols].flat()[0] : "";
    MockWebSocket.#instances.push(this);
    // Simulate async behavior of WebSocket as much as possible.
    queueMicrotask(() => {
      this.#readyState = 1;
      this.dispatchEvent(new Event("open"));
    });
  }

  binaryType: "blob" | "arraybuffer" = "blob";
  readonly bufferedAmount: number = 0;
  readonly extensions: string = "";
  readonly protocol: string;
  readonly url: string;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  get readyState(): number {
    return this.#readyState;
  }
  #readyState = 0;

  get remote(): MockWebSocket {
    if (!this.#remote) {
      this.#remote = new MockWebSocket(this.url);
      this.#remote.#remote = this;
    }
    return this.#remote;
  }
  #remote: MockWebSocket | undefined;

  close(code?: number, reason?: string): void {
    this.#readyState = 2;
    // Simulate async behavior of WebSocket as much as possible.
    queueMicrotask(() => {
      if (this.#remote) {
        this.#remote.#readyState = 3;
        this.#remote.dispatchEvent(new CloseEvent("close", { code, reason }));
      }
      this.#readyState = 3;
      this.dispatchEvent(new CloseEvent("close", { code, reason }));
    });
  }

  send(data: MessageEventData): void {
    // Simulate async behavior of WebSocket as much as possible.
    queueMicrotask(() =>
      this.#remote?.dispatchEvent(new MessageEvent("message", { data }))
    );
  }

  onclose = null;
  onerror = null;
  onmessage = null;
  onopen = null;

  addEventListener: WebSocket["addEventListener"] = super.addEventListener;
  removeEventListener: WebSocket["removeEventListener"] = super
    .removeEventListener;
  dispatchEvent: WebSocket["dispatchEvent"] = super.dispatchEvent;

  static get CONNECTING(): number {
    return 0;
  }
  static get OPEN(): number {
    return 1;
  }
  static get CLOSING(): number {
    return 2;
  }
  static get CLOSED(): number {
    return 3;
  }
}
