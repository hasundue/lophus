// Global timeline streaming
import { Relay } from "https://deno.land/x/lophus/client.ts";
import { Timestamp } from "https://deno.land/x/lophus/lib/times.ts";

new Relay("wss://nos.lol")
  .subscribe({ kinds: [1], since: Timestamp.now })
  .pipeTo(new WritableStream({ write: (ev) => console.log(ev) }));
