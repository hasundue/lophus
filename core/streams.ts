import { push } from "./x/streamtools.ts";

export type BroadcastPromise<T> = keyof Pick<
  typeof Promise<T>,
  "all" | "race" | "any"
>;

export function broadcast<T = unknown>(
  source: ReadableStream<T>,
  targets: WritableStream<T>[],
  promise: BroadcastPromise<T> = "all",
) {
  return source.pipeTo(
    new WritableStream({
      write: (msg) => {
        // deno-lint-ignore no-explicit-any
        return (Promise[promise] as any)(
          targets.map((target) => push(target, msg)),
        );
      },
    }),
  );
}

/**
 * Merge multiple streams into one.
 */
export function merge<R extends unknown>(
  streams: ReadableStream<R>[],
) {
  const readers = streams.map((st) => st.getReader());
  return new ReadableStream<R>({
    pull(controller) {
      Promise.race(readers.map(async (r) => {
        const { value, done } = await r.read();
        if (value) controller.enqueue(value);
        if (done) throw done;
      }));
    },
  });
}

export class NonExclusiveWritableStream<W = unknown>
  implements WritableStream<W> {
  readonly locked = false;

  #aggregator: WritableStream<W>;
  #channels = new Map<string, ReadableStream<W>>();

  constructor(
    protected underlyingSink: UnderlyingSink<W>,
    protected strategy?: QueuingStrategy<W>,
  ) {
    this.#aggregator = this.#update();
  }

  #update() {
    this.#aggregator = new WritableStream<W>({
      write: (chunk, controller) => {
        this.underlyingSink.write?.(chunk, controller);
      },
      close: this.underlyingSink.close,
      abort: this.underlyingSink.abort,
    }, this.strategy);

    merge(Array.from(this.#channels.values())).pipeTo(this.#aggregator);

    return this.#aggregator;
  }

  getWriter() {
    const key = crypto.randomUUID();
    const channel = new TransformStream<W, W>({
      flush: (controller) => {
        controller.terminate();
        this.#channels.delete(key);
        this.#update();
      },
    });
    this.#channels.set(key, channel.readable);
    this.#update();
    return channel.writable.getWriter();
  }

  // TODO: Make this parallel
  async abort() {
    for (const ch of this.#channels.values()) {
      await ch.cancel();
    }
    await this.#aggregator.abort();
  }

  // TODO: Make this parallel
  async close() {
    for (const ch of this.#channels.values()) {
      await ch.cancel();
    }
    await this.#aggregator.close();
  }
}
