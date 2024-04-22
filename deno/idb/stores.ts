import { match, placeholder as _, RegularPlaceholder } from "@core/match";
import { associateWith } from "@std/collections/associate-with";

import { _IDBDatabase } from "./databases.ts";
import { _IDBIndex, IDBIndex } from "./indexes.ts";
import { IDBValidKey, isIDBKey, KvKeyFactoryRecord as $ } from "./keys.ts";
import { _IDBRequest, IDBRequest } from "./requests.ts";
import { _IDBTransaction, IDBTransaction } from "./transactions.ts";

export interface IDBObjectStore<
  M extends IDBTransactionMode = IDBTransactionMode,
> {
  readonly keyPath: string | string[] | null;
  readonly name: string;
  readonly transaction: IDBTransaction<M>;
  readonly autoIncrement: boolean;

  add: M extends "readonly" ? undefined : (
    value: unknown,
    key?: IDBValidKey,
  ) => IDBRequest<IDBValidKey>;

  createIndex: M extends "readonly" | "readwrite" ? undefined : (
    indexName: string,
    keyPath: string | string[],
    options?: IDBIndexParameters,
  ) => IDBIndex;

  get(key: IDBValidKey): IDBRequest<unknown>;
}

/**
 * Internal implementation of IDBObjectStore
 */
export function _IDBObjectStore<M extends IDBTransactionMode>(
  transaction: _IDBTransaction<M>,
  name: string,
  options: IDBObjectStoreParameters,
): IDBObjectStore<M> {
  const keyPath = options?.keyPath ?? null;
  const autoIncrement = options?.autoIncrement ?? false;

  const store: IDBObjectStore<M> = {
    keyPath,
    name,
    transaction,
    autoIncrement,

    // @ts-ignore: TS doesn't understand the conditional type
    add: transaction.mode === "readonly" ? undefined : (
      value: unknown,
      key?: IDBValidKey,
    ): IDBRequest<IDBValidKey> => {
      if (transaction.mode === "readonly") {
        throw new DOMException(
          "Transaction is read-only.",
          "ReadOnlyError",
        );
      }
      const result = ensureKey(options, value, key);
      const parts = Array.isArray(result) ? result : [result];
      return transaction._createRequest(
        store,
        () => {
          (transaction as _IDBTransaction<M>)._atomic.set(
            $.value(transaction.db.name, name, ...parts),
            value,
          );
          return Promise.resolve(result);
        },
      );
    },

    // @ts-ignore: TS doesn't understand the conditional type
    createIndex: transaction.mode !== "versionchange" ? undefined : (
      indexName: string,
      keyPath: string | string[],
      options?: IDBIndexParameters,
    ): IDBIndex => {
      if (transaction.mode !== "versionchange") {
        throw new DOMException(
          "IDBObjectStore.createIndex was not called from a versionchange transaction callback.",
          "InvalidStateError",
        );
      }
      return new _IDBIndex(indexName, keyPath, options);
    },

    get(key: IDBValidKey): IDBRequest<unknown> {
      const keyArray = Array.isArray(key) ? key : [key];
      const request = transaction._createRequest(
        store,
        async () => {
          const kv = (this.transaction.db as _IDBDatabase)._kv;
          const result = await kv.get(
            $.value(transaction.db.name, name, ...keyArray),
          );
          return result.versionstamp ? result.value : undefined;
        },
      );
      return request;
    },
  };
  return store;
}

function ensureKey(
  options: IDBObjectStoreParameters,
  value: unknown,
  key?: IDBValidKey,
): IDBValidKey {
  const { autoIncrement, keyPath } = options;
  if (key) {
    if (autoIncrement) {
      throw new DOMException(
        "Key was provided, but store has a key generator.",
        "DataError",
      );
    }
    if (keyPath) {
      throw new DOMException(
        "Key was provided, but store uses a inline key.",
        "DataError",
      );
    }
    return key;
  }
  if (autoIncrement) {
    // FIXME: Implement key generator
    return 0;
  }
  if (keyPath) {
    try {
      return Array.isArray(keyPath)
        ? getValues(value, keyPath, isIDBKey).flat()
        : getValues(value, [keyPath], isIDBKey)[0];
    } catch {
      throw new DOMException(
        "Value does not include the inline key.",
        "DataError",
      );
    }
  }
  throw new DOMException(
    "Key was not provided, but store has no key generator nor uses inline key.",
    "DataError",
  );
}

function getValues<K extends string, V extends unknown>(
  from: unknown, // expected to extend Record<K, V>
  by: K[],
  guard: (value: unknown) => value is V, // type guard for each entry
): V[] {
  const pattern = associateWith(
    by,
    (it) => _(it, guard),
  ) as { [L in K]: RegularPlaceholder<L, (value: unknown) => value is V> };
  const result = match(pattern, from) as Record<K, V> | undefined;
  if (!result) {
    throw new TypeError(`Could not extract expected values from ${from}.`);
  }
  return by.map((key) => result[key]);
}
