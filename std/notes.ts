import type { Optional } from "../lib/types.ts";
import type { NostrEvent, RelayUrl } from "../core/protocol.ts";
import { EventInit } from "./events.ts";

export type TextNote = EventInit<1>;

export type TextNoteInit = Optional<TextNote, "kind">;

export class TextNoteComposer extends TransformStream<TextNoteInit, TextNote> {
  constructor(readonly opts: { recommendedRelay?: RelayUrl } = {}) {
    super({
      transform: (event, controller) => {
        controller.enqueue(this.compose(event));
      },
    });
  }
  compose(
    init: TextNoteInit,
    opts?: {
      replyTo?: NostrEvent;
      recommendedRelay?: RelayUrl;
    },
  ): TextNote {
    const relay = opts?.recommendedRelay ?? this.opts.recommendedRelay;
    const tags = (init.tags ?? []).concat(
      opts?.replyTo
        ? [
          ["e", opts.replyTo.id, relay],
          ["p", opts.replyTo.pubkey, relay],
        ]
        : [],
    );
    return { ...init, kind: 1, tags };
  }
}
