import { Lock } from "./x/async.ts";
import { push } from "./x/streamtools.ts";

export class NonExclusiveReadableStream<R = unknown> {
  readonly locked = false;

  #source: ReadableStream<R>;
  #aborter = new AbortController();

  constructor(
    underlyingSource: UnderlyingSource<R>,
    readonly strategy?: QueuingStrategy<R>,
  ) {
    this.#source = new ReadableStream<R>(underlyingSource, strategy);
  }

  #branch(): ReadableStream<R> {
    const [source, branch] = this.#source.tee();
    this.#source = source;
    return branch;
  }

  getReader(): ReadableStreamDefaultReader<R> {
    const branch = this.#branch();
    const reader = branch.getReader();

    // Cancel the branch when released
    reader.closed.catch(() => branch.cancel());

    return reader;
  }

  pipeTo(writable: WritableStream<R>, options?: PipeOptions): Promise<void> {
    return this.#branch().pipeTo(writable, {
      signal: this.#aborter.signal,
      ...options,
    });
  }

  pipeThrough<T>(
    transform: TransformStream<R, T>,
    options?: PipeOptions,
  ): ReadableStream<T> {
    return this.#branch().pipeThrough(transform, {
      signal: this.#aborter.signal,
      ...options,
    });
  }

  cancel(): Promise<void> {
    this.#aborter.abort();
    return this.#source.cancel();
  }
}

export class NonExclusiveWritableStream<W = unknown>
  implements WritableStream<W> {
  readonly locked = false;

  readonly #sink: Lock<WritableStream<W>>;
  readonly #aborter = new AbortController();

  constructor(
    underlyingSink: UnderlyingSink<W>,
    strategy?: QueuingStrategy<W>,
  ) {
    this.#sink = new Lock(
      new WritableStream<W>(underlyingSink, strategy),
    );
  }

  #channel() {
    return new WritableStream<W>({
      write: (chunk) => this.#sink.lock((sink) => push(sink, chunk)),
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
    transform.readable.pipeTo(this.#channel(), {
      signal: this.#aborter.signal,
      ...options,
    }).catch((err) => {
      if (err.name !== "AbortError") throw err;
    });
    return transform.writable;
  }

  close(): Promise<void> {
    this.#aborter.abort();
    return this.#sink.lock((sink) => sink.close());
  }

  abort(): Promise<void> {
    this.#aborter.abort();
    return this.#sink.lock((sink) => sink.abort());
  }
}
