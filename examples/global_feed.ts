import { connect } from "../client.ts";

const relay = connect({ url: "wss://nos.lol" });
const events = relay.subscribe({ kinds: [1] });

for await (const event of events) {
  console.log(event);
}
