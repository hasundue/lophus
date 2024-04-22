import { DOMStringList } from "@lophus/lib/legacy";
import { EventHandler } from "./events.ts";
import { _IDBDatabase, IDBDatabase } from "./databases.ts";
import { _IDBObjectStore, IDBObjectStore } from "./stores.ts";
import { _IDBRequest, IDBRequestSource } from "./requests.ts";

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

  /**
   * An internal method to add a request to the transaction.
   * @internal
   */
  _createRequest<R>(
    source: IDBRequestSource | null,
    operation: () => Promise<R>,
  ): _IDBRequest<R> {
    if (this._completed) {
      throw new DOMException(
        "The transaction has already completed.",
        "TransactionInactiveError",
      );
    }
    const request = new _IDBRequest<R>(
      source,
      this as AnyIDBTransaction,
      operation,
    );
    this._requests.add(request);
    request.addEventListener("success", async () => {
      this._requests.delete(request);
      if (this._requests.size === 0) {
        await this._atomic.commit();
        this._completed = true;
        this.dispatchEvent(new Event("complete"));
      }
    });
    return request;
  }
  readonly _requests: Set<_IDBRequest> = new Set();
  _completed: boolean = false;
}
