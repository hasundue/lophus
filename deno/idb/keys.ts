import { KvKeyFactory } from "../kv.ts";

export type IDBValidKey = IDBValidKeyPart | IDBValidKeyPart[];
export type IDBValidKeyPart = number | string;

export function isIDBKey(value: unknown): value is IDBValidKey {
  if (Array.isArray(value)) {
    return value.every((it) => isIDBKey(it));
  }
  return typeof value === "number" || typeof value === "string";
}

const KvKey = KvKeyFactory("__indexedDB__");

export const KvKeyFactoryRecord = {
  database: KvKey(["databases"], (name: string) => [name]),
  store: KvKey(
    ["stores"],
    (database: string, name: string) => [database, name],
  ),
  value: KvKey(
    ["values"],
    (
      database: string,
      store: string,
      ...key: Deno.KvKey
    ) => [database, store, ...key],
  ),
} as const;
