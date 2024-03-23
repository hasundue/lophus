import { Relay, useWebSocketImplementation } from "nostr-tools/relay";
import { BenchContext } from "./types.ts";

let received: (() => void) | undefined;

export function setup(c: BenchContext) {
  useWebSocketImplementation(c.WebSocket);
}

export async function subscribe() {
  const relay = await Relay.connect("ws://localhost:80");
  return relay.subscribe([{ kinds: [1] }], { onevent: () => received?.() });
}

export async function receive() {
  await new Promise<void>((resolve) => {
    received = resolve;
  });
}
