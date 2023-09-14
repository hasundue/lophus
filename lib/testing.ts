export class MockWebSocket extends EventTarget implements WebSocket {
  readonly CONNECTING = WebSocket.CONNECTING;
  readonly OPEN = WebSocket.OPEN;
  readonly CLOSING = WebSocket.CLOSING;
  readonly CLOSED = WebSocket.CLOSED;

  binaryType: "blob" | "arraybuffer" = "blob";
  readonly bufferedAmount: number = 0;
  readonly extensions: string = "";
  readonly protocol: string;
  readonly url: string;

  #readyState: number = WebSocket.OPEN;
  get readyState(): number {
    return this.#readyState;
  }

  #stream_outgoing?: TransformStream<Event>;
  #stream_incoming?: TransformStream<MessageEventData>;

  get readable() {
    this.#stream_outgoing ??= new TransformStream<Event>();
    return this.#stream_outgoing.readable;
  }
  get writable() {
    this.#stream_incoming ??= new TransformStream<MessageEventData>();
    return this.#stream_incoming.writable;
  }

  constructor(url?: string | URL, protocols?: string | string[]) {
    super();
    this.url = url?.toString() ?? "";
    this.protocol = protocols ? protocols.toString() : "";
  }

  async close(code?: number, reason?: string): Promise<void> {
    this.#readyState = WebSocket.CLOSING;
    const writer = this.#stream_outgoing?.writable.getWriter();
    if (writer) {
      await writer.ready;
      await writer.write(
        new CloseEvent("close", { code, reason, wasClean: true }),
      );
      await writer.close();
    }
    this.#readyState = WebSocket.CLOSED;
  }

  async send(data: MessageEventData): Promise<void> {
    const writer = this.#stream_outgoing?.writable.getWriter();
    if (writer) {
      await writer.ready;
      await writer.write(
        new MessageEvent("message", { data }),
      );
      writer.releaseLock();
    }
  }

  addEventListener: WebSocket["addEventListener"] = super.addEventListener;
  removeEventListener: WebSocket["removeEventListener"] = super
    .removeEventListener;
  dispatchEvent: WebSocket["dispatchEvent"] = super.dispatchEvent;

  onclose: WebSocket["onclose"] = null;
  onerror: WebSocket["onerror"] = null;
  onmessage: WebSocket["onmessage"] = null;
  onopen: WebSocket["onopen"] = null;
}

type MessageEventData = string | ArrayBufferLike | Blob | ArrayBufferView;
