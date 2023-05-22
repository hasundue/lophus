// Global feed streaming
import { Relay } from "../client.ts";
import { Timestamp } from "../lib/times.ts";

const relay = new Relay({ url: "wss://nos.lol" });
const sub = relay.subscribe({ kinds: [1], since: Timestamp.now });

for await (const event of sub.events) {
  console.log(event);
}
