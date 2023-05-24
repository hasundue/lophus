// Global timeline streaming
import { Relay } from "../client.ts";
import { Timestamp } from "../lib/times.ts";

const relay = new Relay({ url: "wss://nos.lol" });

relay.request("GLOBAL", [{ kinds: [1], since: Timestamp.now }]);

relay.messages.pipeTo(
  new WritableStream({ write: (event) => console.log(event) }),
);
