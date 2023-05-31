import { Lock } from "./x/async.ts";

export class NonExclusiveReadableStream<R = unknown>
  implements ReadableStream<R> {
  readonly locked = false;

  #source: ReadableStream<R>;
  #aborter = new AbortController();

  constructor(
    underlyingSource: UnderlyingSource<R>,
    strategy?: QueuingStrategy<R>,
  ) {
    this.#source = new ReadableStream<R>(underlyingSource, strategy);
  }

  #branch(): ReadableStream<R> {
    const [source, branch] = this.#source.tee();
    this.#source = source;
    return branch;
  }

  getReader(options?: { mode?: undefined }): ReadableStreamDefaultReader<R>;
  getReader(options?: { mode: "byob" }): ReadableStreamBYOBReader;

  getReader(options?: { mode?: "byob" | undefined }) {
    const branch = this.#branch();

    const reader = options?.mode === "byob"
      ? branch.getReader({ mode: "byob" })
      : branch.getReader({ mode: undefined });

    // Cancel the branch when released
    reader.closed.catch(() => branch.cancel());

    return reader;
  }

  pipeTo(
    writable: WritableStream<R>,
    options?: PipeOptions,
  ): Promise<void> {
    const branch = this.#branch();

    return branch.pipeTo(writable, {
      signal: this.#aborter.signal,
      ...options,
    }).catch((err) => {
      if (err.name !== "AbortError") throw err;
      return branch.cancel();
    });
  }

  pipeThrough<T>(
    transform: TransformStream<R, T>,
    options?: PipeOptions,
  ): ReadableStream<T> {
    return this.#branch().pipeThrough(transform, options);
  }

  tee(): [this, this] {
    return [this, this];
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<R> {
    return this.#branch()[Symbol.asyncIterator]();
  }

  cancel(): Promise<void> {
    this.#aborter.abort();
    return this.#source.cancel();
  }
}

export class NonExclusiveWritableStream<W = unknown>
  implements WritableStream<W> {
  readonly locked = false;

  readonly #writer: Lock<WritableStreamDefaultWriter<W>>;
  readonly #aborter = new AbortController();

  constructor(
    underlyingSink: UnderlyingSink<W>,
    strategy?: QueuingStrategy<W>,
  ) {
    this.#writer = new Lock(
      new WritableStream<W>(underlyingSink, strategy).getWriter(),
    );
  }

  #channel() {
    return new WritableStream<W>({
      write: (chunk) => this.#writer.lock((writer) => writer.write(chunk)),
    });
  }

  getWriter() {
    const channel = this.#channel();
    const writer = channel.getWriter();

    // Close the channel when the lock gets released
    writer.closed.catch(() => channel.close());

    return writer;
  }

  pipedThrough<I>(
    transform: TransformStream<I, W>,
    options?: PipeOptions,
  ): WritableStream<I> {
    const channel = this.#channel();

    transform.readable.pipeTo(channel, {
      signal: this.#aborter.signal,
      ...options,
    }).catch((err) => {
      if (err.name !== "AbortError") throw err;
      return channel.abort();
    });

    return transform.writable;
  }

  close(): Promise<void> {
    this.#aborter.abort();
    return this.#writer.lock((writer) => writer.close());
  }

  abort(): Promise<void> {
    this.#aborter.abort();
    return this.#writer.lock((writer) => writer.abort());
  }
}
