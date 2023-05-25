import {
  EventId,
  EventKind,
  EventTag,
  PubKeyTag,
  PublicKey,
  RelayUrl,
  SignedEvent,
  UnsignedEvent,
} from "../nips/01.ts";
import { Determined, Optional, Overload, Replace } from "../core/types.ts";
import { Timestamp } from "./times.ts";

export type EventTemplate<K extends EventKind> = Overload<
  Determined<Optional<UnsignedEvent, "created_at" | "pubkey">, "kind", K>,
  "tags",
  { erefs?: EventId[]; prefs?: PublicKey[] }
>;

export type TextNoteEvent = Replace<
  UnsignedEvent,
  "kind",
  EventKind.TextNote
>;
export type TextNoteTemplate = EventTemplate<EventKind.TextNote>;
export type TextNoteTemplater = (event: SignedEvent) => TextNoteTemplate;

export class TextNoteComposer
  extends TransformStream<TextNoteTemplate, TextNoteEvent> {
  constructor(
    readonly pubkey: PublicKey,
  ) {
    super({
      transform: (event, controller) => {
        controller.enqueue(this.compose(event));
      },
    });
  }
  compose(
    template: TextNoteTemplate,
    opts?: { relay_recommend?: RelayUrl },
  ): TextNoteEvent {
    const etags: EventTag[] =
      template.erefs?.map((id) => ["e", id, opts?.relay_recommend ?? ""]) ?? [];
    const ptags: PubKeyTag[] =
      template.prefs?.map((id) => ["p", id, opts?.relay_recommend ?? ""]) ?? [];
    return {
      ...template,
      pubkey: this.pubkey,
      created_at: Timestamp.now,
      kind: EventKind.TextNote,
      tags: [...etags, ...ptags, ...(template.tags ?? [])],
    };
  }
}

export class ReplyComposer extends TextNoteComposer {
  constructor(
    readonly pubkey: PublicKey,
  ) {
    super(pubkey);
  }
  compose(
    template: TextNoteTemplate,
    opts: { replyTo: SignedEvent; relay_recommend?: RelayUrl },
  ): TextNoteEvent {
    const note = super.compose(template, opts);
    return {
      ...note,
      tags: [
        ...(note.tags ?? []),
        ["e", opts.replyTo.id, opts?.relay_recommend ?? ""],
        ["p", opts.replyTo.pubkey, opts?.relay_recommend ?? ""],
      ],
    };
  }
}
