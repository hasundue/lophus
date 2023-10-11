/**
 * Type-safe Object.entries and related functions
 *
 * Ref: https://dev.to/harry0000/a-bit-convenient-typescript-type-definitions-for-objectentries-d6g
 */
export const Record = {
  keys<T extends Record<string, unknown>>(object: T): ReadonlyArray<keyof T> {
    return Object.keys(object) as unknown as ReadonlyArray<keyof T>;
  },
  values<T extends Record<string, unknown>>(
    object: T,
  ): ReadonlyArray<T[keyof T]> {
    return Object.values(object) as unknown as ReadonlyArray<T[keyof T]>;
  },
  entries<T extends Record<string, unknown>>(
    object: T,
  ): ReadonlyArray<Entry<T>> {
    return Object.entries(object) as unknown as ReadonlyArray<Entry<T>>;
  },
};

type Entry<T extends Record<string, unknown>> = T extends
  readonly [unknown, ...unknown[]] ? TupleEntry<T>
  : T extends ReadonlyArray<infer U> ? [`${number}`, U]
  : ObjectEntry<T>;

type TupleEntry<
  T extends readonly unknown[],
  I extends unknown[] = [],
  R = never,
> = T extends readonly [infer Head, ...infer Tail]
  ? TupleEntry<Tail, [...I, unknown], R | [`${I["length"]}`, Head]>
  : R;

type ObjectEntry<T extends unknown> = T extends Record<string, unknown>
  ? { [K in keyof T]: [K, Required<T>[K]] }[keyof T] extends infer E
    ? E extends [infer K, infer V] ? K extends string | number ? [`${K}`, V]
      : never
    : never
  : never
  : never;

/**
 * An object contains utility functions for enums
 */
export const Enum = {
  numbers: <T extends Record<string, string | number>>(e: T) =>
    Object.values(e).filter((v) => typeof v === "number") as number[],
};
