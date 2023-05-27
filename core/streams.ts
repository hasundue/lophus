import { Mutex } from "./x/async.ts";
import { push } from "./x/streamtools.ts";

export class NonExclusiveReadableStream<R = unknown> {
  readonly locked = false;

  #source: ReadableStream<R>;

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
    return this.#branch().pipeTo(writable, options);
  }

  pipeThrough<T>(
    transform: TransformStream<R, T>,
    options?: PipeOptions,
  ): ReadableStream<T> {
    return this.#branch().pipeThrough(transform, options);
  }

  cancel(): Promise<void> {
    return this.#source.cancel();
  }
}

export class NonExclusiveWritableStream<W = unknown>
  implements WritableStream<W> {
  readonly locked = false;

  readonly #aggregator: WritableStream<W>;
  readonly #mutex = new Mutex();

  constructor(
    underlyingSink: UnderlyingSink<W>,
    strategy?: QueuingStrategy<W>,
  ) {
    this.#aggregator = new WritableStream<W>(underlyingSink, strategy);
  }

  getWriter() {
    const channel = new WritableStream<W>({
      write: async (chunk) => {
        await this.#mutex.acquire();
        await push(this.#aggregator, chunk);
        this.#mutex.release();
      },
    });
    const writer = channel.getWriter();

    // Close the channel when released
    writer.closed.catch(() => channel.close());

    return writer;
  }

  close(): Promise<void> {
    return this.#aggregator.close();
  }

  abort(): Promise<void> {
    return this.#aggregator.abort();
  }
}
