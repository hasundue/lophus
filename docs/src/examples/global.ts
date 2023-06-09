// Global timeline streaming
import { Relay } from "lophus/client.ts";
import { Timestamp } from "lophus/lib/times.ts";

new Relay("wss://nos.lol")
  .subscribe({ kinds: [1], since: Timestamp.now })
  .pipeTo(new WritableStream({ write: (ev) => console.log(ev) }));
