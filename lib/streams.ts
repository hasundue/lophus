/**
 * TransformStream which filters out duplicate values from a stream.
 */
export class DistinctStream<R = unknown, T = unknown>
  extends TransformStream<R, R> {
  #seen: Set<T>;
  constructor(protected readonly selector: (value: R) => T) {
    super({
      transform: (value, controller) => {
        const key = selector(value);

        if (!this.#seen.has(key)) {
          this.#seen.add(key);
          controller.enqueue(value);
        }
      },
    });
    this.#seen = new Set<T>();
  }
}

export interface ConsoleLogStreamOptions {
  level?: "error" | "warn" | "info" | "debug";
}

export class ConsoleLogStream<W = unknown> extends WritableStream<W> {
  readonly level: ConsoleLogStreamOptions["level"];
  constructor(options?: ConsoleLogStreamOptions) {
    const level = options?.level ?? "info";
    super({
      write(chunk) {
        console[level](chunk);
      },
    });
    this.level = level;
  }
}
