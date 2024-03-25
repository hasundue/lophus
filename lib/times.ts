import { Brand } from "./types.ts";

//-------------------------------------
// Duration
//-------------------------------------
export type Duration = Brand<number, "Duration">;

export const DAY = 86400 as Duration;
export const HOUR = 3600 as Duration;
export const MINUTE = 60 as Duration;
export const SECOND = 1 as Duration;

//-------------------------------------
// Timestamp
//-------------------------------------
export type Timestamp = Brand<number, "Timestamp">;

export const Timestamp = {
  get now() {
    return Math.floor(Date.now() / 1000) as Timestamp;
  },
  past(by: Duration) {
    return Timestamp.now - by as Timestamp;
  },
  future(by: Duration) {
    return Timestamp.now + by as Timestamp;
  },
} as const;
export type TimestampConstructor = typeof Timestamp;
