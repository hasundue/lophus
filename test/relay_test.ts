import { Relay } from "../relay.ts";
import { now } from "../lib/utils.ts";

const relay = new Relay({
  url: "wss://nos.lol",
});

const sub = relay.subscribe({
  kinds: [1],
  since: now(),
});

for await (const event of sub.events) {
  console.log(event);
}
