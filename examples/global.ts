// Global feed streaming
import { Relay } from "../client.ts";

const relay = new Relay({ url: "wss://nos.lol" });
const sub = relay.subscribe({ kinds: [1] });

for await (const event of sub.events) {
  console.log(event);
}
