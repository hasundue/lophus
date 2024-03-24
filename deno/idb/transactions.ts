import { DOMStringList } from "@lophus/lib/legacy";
import { EventHandler } from "./events.ts";
import { _IDBDatabase, IDBDatabase } from "./databases.ts";
import { _IDBObjectStore, IDBObjectStore } from "./stores.ts";

export interface IDBTransaction<
  Mode extends IDBTransactionMode = IDBTransactionMode,
> extends EventTarget {
  readonly db: IDBDatabase;
  readonly error: DOMException | null;
  readonly mode: Mode;
  readonly objectStoreNames: DOMStringList;

  objectStore(name: string): IDBObjectStore<Mode>;

  oncomplete: EventHandler | null;
}

export type AnyIDBTransaction = {
  [K in IDBTransactionMode]: IDBTransaction<K>;
}[IDBTransactionMode];

/**
 * Internal implementation of IDBTransaction
 */
export class _IDBTransaction<Mode extends IDBTransactionMode>
  extends EventTarget
  implements IDBTransaction<Mode> {
  readonly _atomic: Deno.AtomicOperation;
  readonly _stores: Set<string>;

  constructor(
    readonly db: _IDBDatabase,
    readonly mode: Mode = "readonly" as Mode,
    storeNames: string | string[] = [],
    _options?: IDBTransactionOptions,
  ) {
    super();
    this._stores = new Set(
      Array.isArray(storeNames) ? storeNames : [storeNames],
    );
    for (const type of ["complete"] as const) {
      this.addEventListener(type, (event) => this[`on${type}`]?.(event));
    }
    this._atomic = db._kv.atomic();
  }

  get objectStoreNames(): DOMStringList {
    return DOMStringList(this._stores);
  }

  error: DOMException | null = null;
  oncomplete: EventHandler | null = null;

  objectStore(name: string): IDBObjectStore<Mode> {
    const options = this.db._stores.get(name);
    if (!options) {
      throw new DOMException(
        `IDBTransaction.objectStore: Object store "${name}" not found.`,
        "NotFoundError",
      );
    }
    return _IDBObjectStore(this, name, options);
  }
}
