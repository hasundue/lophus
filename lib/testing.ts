type MessageEventData = string | ArrayBufferLike | Blob | ArrayBufferView;

export class MockWebSocket extends EventTarget implements WebSocket {
  /** An AsyncGenerator that yields WebSocket instances. */
  static async *instances() {
    for (;;) {
      if (this.#instances.length > 0) {
        yield this.#instances.shift()!;
      }
      await new Promise<void>((resolve) => {
        this.#pushed = resolve;
      });
      this.#pushed = undefined;
    }
  }
  static readonly #instances: MockWebSocket[] = [];
  static #pushed: (() => void) | undefined;

  constructor(
    url?: string | URL,
    protocols?: string | string[],
    isRemote = false,
  ) {
    super();
    this.url = url?.toString() ?? "";
    this.protocol = protocols ? [...protocols].flat()[0] : "";
    // Simulate async behavior of WebSocket as much as possible.
    queueMicrotask(() => {
      this.#readyState = 1;
      const ev = new Event("open");
      this.dispatchEvent(ev);
      this.onopen?.(ev);
    });
    if (!isRemote) {
      MockWebSocket.#instances.push(this);
      MockWebSocket.#pushed?.();
    }
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
      this.#remote = new MockWebSocket(import.meta.url, undefined, true);
      this.#remote.#remote = this;
    }
    return this.#remote;
  }
  #remote: MockWebSocket | undefined;

  close(code?: number, reason?: string): void {
    this.#readyState = 2;
    if (this.#remote) {
      this.#remote.#readyState = 2;
    }
    // Simulate async behavior of WebSocket as much as possible.
    queueMicrotask(() => {
      const ev = new CloseEvent("close", { code, reason });
      if (this.#remote) {
        this.#remote.#readyState = 3;
        this.#remote.dispatchEvent(ev);
        this.#remote.onclose?.(ev);
      }
      this.#readyState = 3;
      this.dispatchEvent(ev);
      this.onclose?.(ev);
    });
  }

  send(data: MessageEventData): void {
    // Simulate async behavior of WebSocket as much as possible.
    queueMicrotask(() => {
      const ev = new MessageEvent("message", { data });
      this.#remote?.dispatchEvent(ev);
      this.#remote?.onmessage?.(ev);
    });
  }

  onclose: WebSocket["onclose"] = null;
  onerror: WebSocket["onerror"] = null;
  onmessage: WebSocket["onmessage"] = null;
  onopen: WebSocket["onopen"] = null;

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
