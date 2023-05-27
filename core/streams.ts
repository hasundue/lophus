import { Mutex } from "./x/async.ts";
import { push } from "./x/streamtools.ts";
import { allof } from "./utils.ts";
import { noop } from "./utils.ts";

export class Broadcaster<T = unknown> {
  readonly size;

  readonly #writable: WritableStream<T>;
  readonly #targets: Set<WritableStream<T>>;
  readonly #aborter = new AbortController();

  constructor(
    readonly source: ReadableStream<T>,
    targets: WritableStream<T>[] = [],
  ) {
    this.#targets = new Set(targets);

    this.#writable = new WritableStream<T>({
      write: (msg) =>
        allof(...Array.from(this.#targets).map((t) => push(t, msg))),
    });

    this.size = this.#targets.size;
  }

  async start(): Promise<void> {
    if (this.source.locked) {
      return; // already started
    }
    await this.source.pipeTo(this.#writable, { signal: this.#aborter.signal });
  }

  addTarget(target: WritableStream<T>): this {
    this.#targets.add(target);
    return this;
  }

  removeTarget(target: WritableStream<T>): this {
    this.#targets.delete(target);
    return this;
  }

  close(): Promise<void> {
    return allof(
      ...Array.from(this.#targets).map(async (t) => {
        await t.ready;
        return t.close();
      }),
    );
  }
}

export class NonExclusiveReadableStream<R = unknown> {
  readonly locked = false;

  #source: ReadableStream<R>;
  readonly #branches = new Set<ReadableStream<R>>();
  readonly #readers = new Set<ReadableStreamDefaultReader<R>>();

  constructor(
    underlyingSource: UnderlyingSource<R>,
    protected readonly strategy?: QueuingStrategy<R>,
  ) {
    this.#source = new ReadableStream<R>(underlyingSource, strategy);
  }

  #branch() {
    const [source, branch] = this.#source.tee();
    this.#source = source;
    this.#branches.add(branch);
    return branch;
  }

  getReader() {
    const branch = this.#branch();
    const reader = branch.getReader();
    this.#readers.add(reader);

    reader.closed.then(() => {
      this.#readers.delete(reader);
      this.#branches.delete(branch);
      return branch.cancel();
    }).catch(noop); // ignore "Reader was released" error

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
    this.#readers.forEach((r) => r.releaseLock());
    return allof(
      ...Array.from(this.#branches).map((r) => r.cancel()),
      this.#source.cancel(),
    );
  }
}

export class NonExclusiveWritableStream<W = unknown>
  implements WritableStream<W> {
  readonly locked = false;

  readonly #aggregator: WritableStream<W>;
  readonly #writers = new Set<WritableStreamDefaultWriter<W>>();
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
      close: () => {
        this.#writers.delete(writer);
      },
      abort: () => {
        this.#writers.delete(writer);
      },
    });

    const writer = channel.getWriter();
    this.#writers.add(writer);

    (async () => {
      await writer.closed;
      this.#writers.delete(writer);
    })();

    return writer;
  }

  close(): Promise<void> {
    return allof(
      ...Array.from(this.#writers).map((w) => w.close()),
      this.#aggregator.close(),
    );
  }

  abort(): Promise<void> {
    return allof(
      ...Array.from(this.#writers).map((w) => w.abort()),
      this.#aggregator.abort(),
    );
  }
}
