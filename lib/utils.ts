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
