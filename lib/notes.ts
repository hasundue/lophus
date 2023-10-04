import { NostrEvent, RelayUrl } from "../core/nips/01.ts";
import type { Optional } from "../core/types.ts";
import { EventInit } from "./events.ts";

export type TextNote = EventInit<1>;

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
      replyTo?: NostrEvent;
      relayRecommend?: RelayUrl;
    },
  ): TextNote {
    const relayRecommend = opts?.relayRecommend ?? this.opts.relay_recommend;

    // deno-fmt-ignore
    const tags = (init.tags ?? []).concat(opts?.replyTo ? [
      ["e", opts.replyTo.id, relayRecommend ?? ""],
      ["p", opts.replyTo.pubkey, relayRecommend ?? ""],
    ] : []);

    return { ...init, kind: 1, tags };
  }
}
