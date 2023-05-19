import { Mutex } from "../lib/x/async.ts";

//
// Utility functions
//
export const noop = () => {};

//
// Promise
//
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
// Streams API
//
export async function writeSafely<T>(
  stream: WritableStream<T>,
  mutex: Mutex,
  data: T,
) {
  await mutex.acquire();
  const writer = stream.getWriter();
  await writer.ready;
  writer.write(data).catch(console.error);
  await writer.ready;
  writer.releaseLock();
  mutex.release();
}
