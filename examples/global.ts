// Global feed streaming
import { Relay } from "../client.ts";
import { Timestamp } from "../lib/times.ts";

const sub = new Relay({ url: "wss://nos.lol" })
  .subscribe({ kinds: [1], since: Timestamp.now });

sub.events.pipeTo(new WritableStream({ write: (event) => console.log(event) }));
await sub.closed;
