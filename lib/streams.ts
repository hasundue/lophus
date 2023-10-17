/**
 * TransformStream which filters out duplicate values from a stream.
 */
export class Distinctor<R = unknown, T = unknown>
  extends TransformStream<R, R> {
  #seen: Set<T>;
  constructor(protected readonly fn: (value: R) => T) {
    super({
      transform: (value, controller) => {
        const key = fn(value);

        if (!this.#seen.has(key)) {
          this.#seen.add(key);
          controller.enqueue(value);
        }
      },
    });
    this.#seen = new Set<T>();
  }
}

export class Transformer<R = unknown, W = unknown>
  extends TransformStream<R, W> {
  constructor(fn: (chunk: R) => W) {
    super({
      transform(event, controller) {
        const result = fn(event);
        if (result) {
          controller.enqueue(result);
        }
      },
    });
  }
}

export function merge<T>(
  ...streams: ReadableStream<T>[]
) {
  const readers = streams.map((r) => r.getReader());
  return new ReadableStream<T>({
    async pull(controller) {
      await Promise.any(readers.map(async (r) => {
        const { value, done } = await r.read();
        if (done) {
          readers.splice(readers.indexOf(r), 1);
          r.releaseLock();
        }
        if (value) {
          controller.enqueue(value);
        }
      })).catch((e) => {
        if (e instanceof AggregateError) {
          controller.close();
        } else {
          throw e;
        }
      });
    },
  });
}
