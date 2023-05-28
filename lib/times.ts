import { Brand } from "../core/types.ts";

export type Timestamp = Brand<number, "EventTimeStamp">;

export const Timestamp = {
  get now() {
    return Math.floor(Date.now() / 1000) as Timestamp;
  },
};
