// Global feed streaming
import { Relay } from "../client.ts";

const relay = new Relay({ url: "wss://nos.lol" });
const events = relay.subscribe({ kinds: [1] });

for await (const event of events) {
  console.log(event);
}
