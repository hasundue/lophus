/**
 * An experimental polyfill for IndexedDB backed with Deno KV.
 *
 * @module
 */

import { _IDBDatabase, IDBDatabase } from "./databases.ts";
import { _IDBVersionChangeEvent } from "./events.ts";
import { KvKeyFactoryRecord as $ } from "./keys.ts";
import { _IDBOpenDBRequest, IDBOpenDBRequest } from "./requests.ts";
import { _IDBTransaction, IDBTransaction } from "./transactions.ts";

export type { IDBDatabase } from "./databases.ts";
export type { IDBValidKey } from "./keys.ts";
export type { IDBIndex } from "./indexes.ts";
export type { IDBOpenDBRequest, IDBRequest } from "./requests.ts";
export type { IDBObjectStore } from "./stores.ts";
export type { IDBTransaction } from "./transactions.ts";

export interface IDBFactory {
  open(name: string, version?: number): IDBOpenDBRequest<IDBDatabase, null>;
  cmp(a: unknown, b: unknown): -1 | 0 | 1;
  databases(): Promise<IDBDatabaseInfo[]>;
  deleteDatabase(name: string): IDBOpenDBRequest<undefined, null>;
}

export function createIDBFactory(
  kv: Deno.Kv,
): IDBFactory {
  return {
    open(
      name: string,
      version: number = 1,
    ): IDBOpenDBRequest<IDBDatabase, null> {
      return new _IDBOpenDBRequest(async function () {
        // Check if the database already exists and is up to date.
        const existed = await kv.get<IDBDatabaseInfo>($.database(name));
        if (existed.value?.version && existed.value.version >= version) {
          const stores = new Map<string, IDBObjectStoreParameters>();
          const iter = kv.list<IDBObjectStoreParameters>({
            prefix: $.store.prefix,
          });
          for await (const { key, value } of iter) {
            const name = key.toReversed()[0] as string;
            stores.set(name, value);
          }
          return new _IDBDatabase(name, version, kv, stores);
        }
        // Create the new database.
        await kv.set($.database(name), { name, version });
        const db = new _IDBDatabase(name, version, kv, new Map());
        const transaction = new _IDBTransaction(db, "versionchange");
        this.transaction = transaction as IDBTransaction<"versionchange">;
        db._transaction = transaction;
        this.result = db;
        this.dispatchEvent(
          new _IDBVersionChangeEvent(existed.value?.version ?? 0, version),
        );
        await new Promise((resolve) => {
          transaction.addEventListener("complete", resolve);
        });
        db._transaction = null;
        return db;
      }) as IDBOpenDBRequest<IDBDatabase, null>;
    },

    cmp(_a: unknown, _b: unknown): -1 | 0 | 1 {
      console.warn("indexedDB.cmp is not implemented");
      return 0;
    },

    async databases(): Promise<IDBDatabaseInfo[]> {
      const iter = kv.list<IDBDatabaseInfo>({ prefix: $.database.prefix });
      return (await Array.fromAsync(iter)).map((it) => it.value);
    },

    deleteDatabase(name: string): IDBOpenDBRequest<undefined, null> {
      return new _IDBOpenDBRequest(async () => {
        await kv.delete($.database(name));
        return undefined;
      }) as IDBOpenDBRequest<undefined, null>;
    },
  };
}
