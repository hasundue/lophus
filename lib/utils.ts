export type Brand<K, T> = K & { __brand: T };

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type Require<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Replace<T, K extends keyof T, V> = Omit<T, K> & { [P in K]: V };

export const noop = () => {};

export const now = () => Math.floor(Date.now() / 1000);
