export const noop = () => {};

/**
 * Type-safe Object.entries
 *
 * Ref: https://dev.to/harry0000/a-bit-convenient-typescript-type-definitions-for-objectentries-d6g
 */
export function entries<T extends Record<string, unknown>>(
  object: T,
): ReadonlyArray<Entry<T>> {
  return Object.entries(object) as unknown as ReadonlyArray<Entry<T>>;
}

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
