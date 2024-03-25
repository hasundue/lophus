import { EventFilter } from "./protocol.ts";

export function isLimited(filter: EventFilter): boolean;
export function isLimited(filters: EventFilter[]): boolean;

export function isLimited(arg: EventFilter | EventFilter[]): boolean {
  const flts = Array.isArray(arg) ? arg : [arg];
  return flts.every((it) => it.limit);
}
