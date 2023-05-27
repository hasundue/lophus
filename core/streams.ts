import { Mutex } from "./x/async.ts";
import { push } from "./x/streamtools.ts";
import { allof } from "./utils.ts";

export class BroadcastStream<T = unknown> extends WritableStream<T> {
  readonly #writers = new Set<WritableStreamDefaultWriter<T>>();

  constructor(
    readonly targets: WritableStream<T>[],
    readonly strategy?: QueuingStrategy<T>,
  ) {
    super({
      write: (msg) => {
        this.#writers.forEach((w) => w.write(msg));
      },
      close: () => {
        this.#writers.forEach((w) => w.close());
      },
      abort: () => {
        this.#writers.forEach((w) => w.abort());
      },
    }, strategy);

    targets.forEach((t) => this.addTarget(t));
  }

  addTarget(target: WritableStream<T>) {
    this.#writers.add(target.getWriter());
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
