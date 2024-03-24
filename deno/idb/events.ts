import { IDBDatabaseInVersionChange } from "./databases.ts";
import { IDBOpenDBRequest } from "./requests.ts";
import { IDBTransaction } from "./transactions.ts";

export type EventHandler = (ev: Event) => void;
export type VersionChangeEventHandler = (ev: IDBVersionChangeEvent) => void;

/**
 * IDBVersionChangeEvent
 */
export interface IDBVersionChangeEvent extends Event {
  readonly target: IDBOpenDBRequest<
    IDBDatabaseInVersionChange,
    IDBTransaction<"versionchange">
  >;
  readonly oldVersion: number;
  readonly newVersion: number | null;
}

export class _IDBVersionChangeEvent extends Event
  implements IDBVersionChangeEvent {
  declare target: IDBOpenDBRequest<
    IDBDatabaseInVersionChange,
    IDBTransaction<"versionchange">
  >;
  constructor(
    readonly oldVersion: number,
    readonly newVersion: number | null,
  ) {
    super("upgradeneeded");
  }
}
