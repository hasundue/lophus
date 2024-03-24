import van from "mini-van-plate/van-plate";
import { Timestamp } from "@lophus/std/times";
import { Relay } from "./nostr.ts";
import Note from "./components/note.ts";

export function readable(): ReadableStream<string> {
  const relay = new Relay("wss://nos.lol");
  const sub = relay.subscribe({ kinds: [1], since: Timestamp.now });
  return sub.pipeThrough(
    new TransformStream({
      transform: (event, controller) => {
        controller.enqueue(
          van.html(Note({ van, event })),
        );
      },
    }),
  );
}
