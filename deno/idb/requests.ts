import { _IDBDatabase, IDBDatabase } from "./databases.ts";
import {
  _IDBVersionChangeEvent,
  EventHandler,
  VersionChangeEventHandler,
} from "./events.ts";
import { IDBObjectStore } from "./stores.ts";
import { AnyIDBTransaction, IDBTransaction } from "./transactions.ts";

export interface IDBRequest<
  Result = unknown,
  Transaction extends AnyIDBTransaction | null = AnyIDBTransaction | null,
> extends EventTarget {
  readonly error: DOMException | null;
  readonly result: Result;
  readonly readyState: IDBRequestReadyState;
  readonly source: IDBRequestSource | null;
  readonly transaction: Transaction;

  onerror: EventHandler | null;
  onsuccess: EventHandler | null;
}

export class _IDBRequest<Result = unknown> extends EventTarget
  implements IDBRequest<Result> {
  constructor(
    readonly source: IDBRequestSource | null,
    readonly transaction: AnyIDBTransaction | null,
    operation: (this: _IDBRequest<Result>) => Promise<Result>,
  ) {
    super();
    for (const type of ["error", "success"] as const) {
      this.addEventListener(type, (event) => this[`on${type}`]?.(event));
    }
    operation.apply(this).then((result) => {
      this.result = result;
      this.dispatchEvent(new Event("success"));
    }).catch((error) => {
      this.error = new DOMException(error.message, error.name);
      this.dispatchEvent(new Event("error"));
    }).finally(() => {
      this.readyState = "done";
    });
  }

  error: DOMException | null = null;

  get result(): Result {
    if (this.#result === undefined) {
      throw new DOMException(
        "The request is not complete",
        "InvalidStateError",
      );
    }
    return this.#result;
  }
  set result(value: Result) {
    this.#result = value;
  }
  #result?: Result;

  readyState: IDBRequestReadyState = "pending";

  onerror: EventHandler | null = null;
  onsuccess: EventHandler | null = null;
}

export type IDBRequestSource = IDBObjectStore | IDBIndex | IDBCursor;

export interface IDBOpenDBRequest<
  Result extends IDBDatabase | undefined = IDBDatabase,
  Context extends IDBTransaction<"versionchange"> | null = null,
> extends IDBRequest<Result, Context> {
  onblocked: VersionChangeEventHandler | null;
  onupgradeneeded: VersionChangeEventHandler | null;
}

export class _IDBOpenDBRequest<
  Result extends IDBDatabase | undefined,
> extends _IDBRequest<Result>
  implements IDBOpenDBRequest<Result, IDBTransaction<"versionchange"> | null> {
  constructor(
    operation: (this: _IDBOpenDBRequest<Result>) => Promise<Result>,
  ) {
    // @ts-ignore bypass nominal type checking on operation
    super(null, null, operation);
  }

  override dispatchEvent(event: Event): boolean {
    if (event instanceof _IDBVersionChangeEvent) {
      // queueMicrotask is needed to avoid a dangling promise
      queueMicrotask(async () => {
        this.onupgradeneeded?.(event);
        await (this.result as _IDBDatabase)._transaction!._atomic.commit();
        this.transaction!.dispatchEvent(new Event("complete"));
      });
    }
    return super.dispatchEvent(event);
  }

  declare source: null;
  declare transaction: IDBTransaction<"versionchange"> | null;

  onblocked: VersionChangeEventHandler | null = null;
  onupgradeneeded: VersionChangeEventHandler | null = null;
}
