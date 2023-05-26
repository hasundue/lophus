export const noop = () => {};

export const allof = <T>(...promises: (Promise<T> | undefined)[]) =>
  Promise.all(promises).then(noop);
