import { push } from "./x/streamtools.ts";
import { Mutex } from "./x/async.ts";
import { allof } from "./utils.ts";

export type BroadcastPromise<T> = keyof Pick<
  typeof Promise<T>,
  "all" | "race" | "any"
>;

export function broadcast<T = unknown>(
  source: ReadableStream<T>,
  targets: WritableStream<T>[],
) {
  return source.pipeTo(
    new WritableStream({
      write: (msg) => {
        return Promise.race(
          targets.map((target) => push(target, msg)),
        );
      },
    }),
  );
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
