// deno-lint-ignore no-empty-interface
export interface NipRecord {}

export type NIP = keyof NipRecord & number;
