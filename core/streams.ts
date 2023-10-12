import { Lock } from "./x/async.ts";

/**
 * A writable stream that can be written to by multiple writers at the same time.
 *
 * It is not essential for this class to extend `EventTarget`, but it is
 * convenient for the `NostrNode` class to be able to extend this class and
 * `EventTarget` at the same time.
 */
export class NonExclusiveWritableStream<W = unknown> extends EventTarget
  implements WritableStream<W> {
  readonly locked = false;

  readonly #writer: Lock<WritableStreamDefaultWriter<W>>;

  constructor(
    underlyingSink: UnderlyingSink<W>,
    strategy?: QueuingStrategy<W>,
  ) {
    super();
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
    return this.#channel().getWriter();
  }

  close(): Promise<void> {
    return this.#writer.lock((writer) => writer.close());
  }

  abort(): Promise<void> {
    return this.#writer.lock((writer) => writer.abort());
  }
}
