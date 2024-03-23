type MessageEventData = string | ArrayBufferLike | Blob | ArrayBufferView;

export class MockWebSocket extends EventTarget implements WebSocket {
  /**
   * A list of all instances of MockWebSocket.
   * An instance is removed from this list when it is closed.
   */
  static readonly instances = new Set<MockWebSocket>();

  constructor(url?: string | URL, protocols?: string | string[]) {
    super();
    this.url = url?.toString() ?? "";
    this.protocol = protocols ? [...protocols].flat()[0] : "";
    MockWebSocket.instances.add(this);
    // Simulate async behavior of WebSocket as much as possible.
    queueMicrotask(() => {
      this.#readyState = 1;
      const ev = new Event("open");
      this.dispatchEvent(ev);
      this.onopen?.(ev);
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
        const ev = new CloseEvent("close", { code, reason });
        this.#remote.dispatchEvent(ev);
        this.#remote.onclose?.(ev);
        MockWebSocket.instances.delete(this.#remote);
      }
      this.#readyState = 3;
      const ev = new CloseEvent("close", { code, reason });
      this.dispatchEvent(ev);
      this.onclose?.(ev);
      MockWebSocket.instances.delete(this);
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
