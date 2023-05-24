// Global timeline streaming
import { Relay } from "../client.ts";
import { Timestamp } from "../lib/times.ts";

new Relay({ url: "wss://nos.lol" })
  .subscribe({ kinds: [1], since: Timestamp.now })
  .pipeTo(new WritableStream({ write: (ev) => console.log(ev) }));
