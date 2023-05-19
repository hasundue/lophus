import { connect } from "../relay.ts";
import { now } from "../lib/utils.ts";

const relay = connect({
  url: "wss://nos.lol",
  read: false,
});

const sub = relay.subscribe({
  kinds: [1],
  since: now(),
});

for await (const event of sub.events) {
  console.log(event);
}
