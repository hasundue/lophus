import { Brand } from "@lophus/lib/types";

export type Timestamp = Brand<number, "EventTimeStamp">;

export type TimestampConstructor = Record<TimestampConstructorKey, Timestamp>;

export type TimestampConstructorKey = "now";

export const Timestamp: TimestampConstructor = {
  get now() {
    return Math.floor(Date.now() / 1000) as Timestamp;
  },
};
