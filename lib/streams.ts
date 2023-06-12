export { mergeReadableStreams as merge } from "https://deno.land/std@0.187.0/streams/mod.ts";

/**
 * TransformStream which filters out duplicate values from a stream.
 */
export class Distinctor<R extends unknown, T extends unknown>
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
