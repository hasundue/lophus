import { Brand } from "./types.ts";

//-------------------------------------
// Duration
//-------------------------------------
export type Duration = Brand<number, "Duration">;

export const Duration = {
  DAY: 86400 as Duration,
  HOUR: 3600 as Duration,
  MINUTE: 60 as Duration,
  SECOND: 1 as Duration,
} as const;
export type DurationConstructor = typeof Duration;

//-------------------------------------
// Timestamp
//-------------------------------------
export type Timestamp = Brand<number, "Timestamp">;

export const Timestamp = {
  get now() {
    return Math.floor(Date.now() / 1000) as Timestamp;
  },
  past(duration: Duration) {
    return Timestamp.now - duration as Timestamp;
  },
  future(duration: Duration) {
    return Timestamp.now + duration as Timestamp;
  },
} as const;
export type TimestampConstructor = typeof Timestamp;
