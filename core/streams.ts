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

  close(): Promise<void> {
    this.#aborter.abort();
    return this.#writer.lock((writer) => writer.close());
  }

  abort(): Promise<void> {
    this.#aborter.abort();
    return this.#writer.lock((writer) => writer.abort());
  }
}
