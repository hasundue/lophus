import { Lock } from "./x/async.ts";

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
