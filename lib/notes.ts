import { EventKind, NostrEvent, RelayUrl } from "../nips/01.ts";
import type { Optional } from "../core/types.ts";
import { EventInit } from "./events.ts";

export type TextNote = EventInit<EventKind.TextNote>;

export type TextNoteInit = Optional<TextNote, "kind">;

export class TextNoteComposer extends TransformStream<TextNoteInit, TextNote> {
  constructor(readonly opts: { relay_recommend?: RelayUrl } = {}) {
    super({
      transform: (event, controller) => {
        controller.enqueue(this.compose(event));
      },
    });
  }
  compose(
    init: TextNoteInit,
    opts?: {
      reply_to?: NostrEvent;
      relay_recommend?: RelayUrl;
    },
  ): TextNote {
    const relay_recommend = opts?.relay_recommend ?? this.opts.relay_recommend;

    // deno-fmt-ignore
    const tags = (init.tags ?? []).concat(opts?.reply_to ? [
      ["e", opts.reply_to.id, relay_recommend ?? ""],
      ["p", opts.reply_to.pubkey, relay_recommend ?? ""],
    ] : []);

    return { ...init, kind: EventKind.TextNote, tags };
  }
}
