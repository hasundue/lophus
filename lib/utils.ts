import "https://deno.land/std@0.187.0/dotenv/load.ts";

//
// Utility types
//
export type Brand<K, T> = K & { __brand: T };

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
export type Require<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type Replace<T, K extends keyof T, V> = Omit<T, K> & { [P in K]: V };

//
// Utility functions
//
export const noop = () => {};
export const now = () => Math.floor(Date.now() / 1000);

export function anyof<T, U>(
  iterable: Iterable<T>,
  fn: (value: T) => Promise<U>,
) {
  return Promise.any(Array.from(iterable).map(fn));
}

export function allof<T, U>(
  iterable: Iterable<T>,
  fn: (value: T) => Promise<U>,
) {
  return Promise.all(Array.from(iterable).map(fn));
}

//
// Logging
//
const LogLevelTable = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;
type LogLevel = keyof typeof LogLevelTable;

const LOG_LEVEL = Deno.env.get("LOG_LEVEL")?.toLowerCase() ?? "info";
if (!Object.keys(LogLevelTable).includes(LOG_LEVEL)) {
  throw new Error(`Invalid log level: ${LOG_LEVEL}`);
}
const logLevel = LOG_LEVEL as LogLevel;

export const log = Object.fromEntries(
  Object.entries(LogLevelTable).map(([level, value]) => {
    const fn = value >= LogLevelTable[logLevel]
      ? console[level as LogLevel]
      : noop;
    return [level, fn];
  }),
) as { [K in LogLevel]: typeof console[K] };
