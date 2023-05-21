/**
 * Merge multiple streams into one.
 */
export function merge<R extends unknown>(
  streams: ReadableStream<R>[],
) {
  const readers = streams.map((st) => st.getReader());

  return new ReadableStream<R>({
    async pull(controller) {
      await Promise.any(readers.map(async (r) => {
        const { value, done } = await r.read();
        if (value) {
          controller.enqueue(value);
        }
        if (done) {
          throw done;
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

/**
 * Filter out duplicate values from a stream.
 */
export function distinctBy<R extends unknown, T extends unknown>(
  fn: (value: R) => T,
): TransformStream<R, R> {
  const seen = new Set<T>();
  return new TransformStream<R, R>({
    transform(value, controller) {
      const key = fn(value);
      if (!seen.has(key)) {
        seen.add(key);
        controller.enqueue(value);
      }
    },
  });
}
