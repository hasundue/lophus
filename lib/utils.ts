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
