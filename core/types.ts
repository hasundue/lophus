/**
 * Constructor of branded types
 */
export type Brand<K, T> = K & { __brand: T };

//
// Records and maps
//
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type Require<T, K extends keyof T> = Expand<
  & T
  & Required<Pick<T, K>>
>;

export type Optional<T, K extends keyof T> = Expand<
  & Omit<T, K>
  & Partial<Pick<T, K>>
>;

//
// Promises
//
export type PromiseCallbacks<T> = {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

// Logger
export interface Logger {
  debug?: (...args: unknown[]) => void;
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
}
