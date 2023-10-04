export { mergeReadableStreams as merge } from "./std/streams.ts";

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
