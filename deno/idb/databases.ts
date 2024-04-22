/// <reference lib="dom" />

import { DOMStringList } from "@lophus/lib/legacy";
import {
  _IDBVersionChangeEvent,
  EventHandler,
  VersionChangeEventHandler,
} from "./events.ts";
import { KvKeyFactoryRecord as $ } from "./keys.ts";
import { _IDBObjectStore, IDBObjectStore } from "./stores.ts";
import { _IDBTransaction, IDBTransaction } from "./transactions.ts";

export interface IDBDatabase extends EventTarget {
  readonly name: string;
  readonly version: number;

  transaction<Mode extends NormalTransactionMode = "readonly">(
    storeNames: string | string[],
    mode?: Mode,
    options?: IDBTransactionOptions,
  ): IDBTransaction<Mode>;

  onabort: EventHandler | null;
  onclose: EventHandler | null;
  onerror: EventHandler | null;
  onversionchange: VersionChangeEventHandler | null;

  readonly objectStoreNames: DOMStringList;
}

export interface IDBDatabaseInVersionChange extends IDBDatabase {
  createObjectStore(
    name: string,
    options?: IDBObjectStoreParameters,
  ): IDBObjectStore<"versionchange">;
}

type NormalTransactionMode = "readonly" | "readwrite";

export class _IDBDatabase extends EventTarget
  implements IDBDatabaseInVersionChange {
  _transaction: _IDBTransaction<"versionchange"> | null = null;

  constructor(
    readonly name: string,
    readonly version: number,
    readonly _kv: Deno.Kv,
    readonly _stores: Map<string, IDBObjectStoreParameters>,
  ) {
    super();
    for (const type of ["abort", "close", "error"] as const) {
      this.addEventListener(type, (event) => this[`on${type}`]?.(event));
    }
    addEventListener("versionchange", (event) => {
      if (event instanceof _IDBVersionChangeEvent) {
        this.onversionchange?.(event);
      }
    });
  }

  createObjectStore(
    name: string,
    options: IDBObjectStoreParameters = {},
  ): IDBObjectStore<"versionchange"> {
    if (!this._transaction) {
      throw new DOMException(
        "IDBDatabase.createObjectStore was not called from a versionchange transaction callback.",
        "InvalidStateError",
      );
    }
    this._transaction._atomic.set($.store(this.name, name), options);
    const store = _IDBObjectStore(this._transaction, name, options);
    this._transaction.addEventListener("complete", () => {
      this._stores.set(name, options);
    });
    return store;
  }

  transaction<Mode extends NormalTransactionMode = "readonly">(
    storeNames: string | string[],
    mode?: Mode,
    options?: IDBTransactionOptions,
  ): IDBTransaction<Mode> {
    return new _IDBTransaction(this, mode, storeNames, options);
  }

  onabort: EventHandler | null = null;
  onclose: EventHandler | null = null;
  onerror: EventHandler | null = null;
  onversionchange: VersionChangeEventHandler | null = null;

  get objectStoreNames() {
    return DOMStringList(this._stores.keys());
  }
}
