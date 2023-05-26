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
  readonly #channels = new Set<WritableStream<W>>();
  readonly #mutex = new Mutex();

  constructor(
    protected underlyingSink: UnderlyingSink<W>,
    protected strategy?: QueuingStrategy<W>,
  ) {
    this.#aggregator = new WritableStream<W>({
      write: (chunk, controller) => {
        this.underlyingSink.write?.(chunk, controller);
      },
      close: this.underlyingSink.close,
      abort: this.underlyingSink.abort,
    }, this.strategy);
  }

  getWriter() {
    const channel = new WritableStream<W>({
      write: async (chunk) => {
        await this.#mutex.acquire();
        await push(this.#aggregator, chunk);
        this.#mutex.release();
      },
      close: () => {
        this.#channels.delete(channel);
      },
      abort: () => {
        this.#channels.delete(channel);
      },
    });
    this.#channels.add(channel);
    return channel.getWriter();
  }

  abort(): Promise<void> {
    return allof(
      ...Array.from(this.#channels).map((ch) => ch.abort()),
      this.#aggregator.abort(),
    );
  }

  close(): Promise<void> {
    return allof(
      ...Array.from(this.#channels).map((ch) => ch.close()),
      this.#aggregator.close(),
    );
  }
}
