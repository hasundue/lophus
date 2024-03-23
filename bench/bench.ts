import { MockWebSocket } from "@lophus/lib/testing";
import { TextNoteComposer } from "@lophus/std/notes";
import { generatePrivateKey, Signer } from "@lophus/std/signs";

const LIBS = ["lophus", "nostr_tools"] as const;

const nsec = generatePrivateKey();
const note = new TextNoteComposer().compose({
  content: "bench",
});
const event = new Signer(nsec).sign(note);

for (const lib of LIBS) {
  Deno.bench({
    name: lib,
    baseline: lib === "lophus",
    group: "subscribe",
    async fn({ start, end }) {
      const { setup, subscribe } = await import(`./${lib}.ts`);
      const done = (async () => {
        const { value: ws } = await MockWebSocket.instances().next();
        return new Promise((resolve) =>
          ws!.remote.addEventListener("message", resolve)
        );
      })();
      setup({ WebSocket: MockWebSocket });
      start();
      subscribe();
      await done;
      end();
    },
  });

  Deno.bench({
    name: lib,
    baseline: lib === "lophus",
    group: "get an event",
    async fn({ start, end }) {
      const { setup, subscribe, receive } = await import(`./${lib}.ts`);
      setup({ WebSocket: MockWebSocket });
      const sent = (async () => {
        const { value: ws } = await MockWebSocket.instances().next();
        return new Promise<void>((resolve) => {
          ws!.remote.addEventListener("message", (msg) => {
            const [, id] = JSON.parse(msg.data);
            ws!.remote.send(
              JSON.stringify(["EVENT", id, event]),
            );
            resolve();
          });
        });
      })();
      start();
      const sub = await subscribe();
      const received = receive(sub);
      await sent;
      await received;
      end();
    },
  });
}
