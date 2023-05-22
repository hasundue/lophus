import { EventTimestamp } from "../nips/01.ts";

export class Timestamp {
  static get now() {
    return Math.floor(Date.now() / 1000) as EventTimestamp;
  }
}
