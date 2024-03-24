/**
 * Utilities for Deno KV
 *
 * @module
 */

export interface KvKeyConstructor<
  R extends Deno.KvKeyPart,
  P extends Deno.KvKeyPart[],
  S extends Deno.KvKeyPart[],
> {
  (...specifier: S): Deno.KvKey;
  prefix: [R, ...P];
}

export interface KvKeyFactory<R extends Deno.KvKeyPart> {
  <P extends Deno.KvKeyPart[], S extends Deno.KvKeyPart[]>(
    prefix: Readonly<P>,
    fn: (...specifier: S) => Deno.KvKey,
  ): KvKeyConstructor<R, P, S>;
}

export function KvKeyFactory<R extends Deno.KvKeyPart>(
  root: R,
): KvKeyFactory<R> {
  return <P extends Deno.KvKeyPart[], S extends Deno.KvKeyPart[]>(
    prefix: Readonly<P>,
    fn: (...specifier: S) => Deno.KvKey,
  ): KvKeyConstructor<R, P, S> => {
    const ret = (
      ...specifier: S
    ): Deno.KvKey => [root, ...prefix, ...fn(...specifier)];
    Object.defineProperty(ret, "prefix", { value: [root, ...prefix] });
    return ret as KvKeyConstructor<R, P, S>;
  };
}
