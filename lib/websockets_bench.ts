import { MockWebSocket } from "@lophus/lib/testing";
import { LazyWebSocket } from "./websockets.ts";

Deno.bench("new", () => {
  new LazyWebSocket("wss://localhost:8080");
});

Deno.bench("addEventListner", () => {
  const lazy = new LazyWebSocket("wss://localhost:8080");
  lazy.addEventListener("open", () => {});
});

Deno.bench("ready", async (b) => {
  globalThis.WebSocket = MockWebSocket;
  const lazy = new LazyWebSocket("wss://localhost:8080");
  lazy.addEventListener("open", () => {});
  b.start();
  await lazy.ready();
  b.end();
});
