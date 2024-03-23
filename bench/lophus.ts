import { NostrEvent, Relay } from "@lophus/nips";
import { BenchContext } from "./types.ts";

export function setup(c: BenchContext) {
  globalThis.WebSocket = c.WebSocket;
}

export function subscribe() {
  const relay = new Relay("ws://localhost:80");
  return relay.subscribe({ kinds: [1] }, { id: "bench" });
}

export async function receive(sub: ReadableStream<NostrEvent<1>>) {
  await sub.getReader().read();
}
