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
