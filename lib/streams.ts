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

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface ConsoleLoggerOptions {
  level?: LogLevel;
}

export class ConsoleLogger<W = unknown> extends WritableStream<W> {
  readonly level: LogLevel;
  constructor(options?: ConsoleLoggerOptions) {
    const level = options?.level ?? "info";
    super({
      write(chunk) {
        console[level](chunk);
      },
    });
    this.level = level;
  }
}
