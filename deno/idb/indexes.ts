export interface IDBIndex {
  readonly name: string;
  readonly keyPath: string | string[];
  readonly unique: boolean;
}

export class _IDBIndex implements IDBIndex {
  readonly unique: boolean;

  constructor(
    readonly name: string,
    readonly keyPath: string | string[],
    options?: IDBIndexParameters,
  ) {
    this.unique = options?.unique ?? false;
  }
}
