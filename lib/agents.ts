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
import { Timestamp } from "../lib/time.ts";
import { Determined, Optional, Overload, Replace } from "../lib/types.ts";

export class DefaultAgent<SignedEvent, T>
  extends TransformStream<SignedEvent, T> {
  constructor(fn: (event: SignedEvent) => T) {
    super({
      transform(event, controller) {
        const result = fn(event);
        if (result) {
          controller.enqueue(result);
        }
      },
    });
  }
}

export type EventTemplate<K extends EventKind> = Overload<
  Determined<Optional<UnsignedEvent, "created_at" | "pubkey">, "kind", K>,
  "tags",
  { erefs?: EventId[]; prefs?: PublicKey[] }
>;

//
// Text notes
//
export type TextNoteEvent = Replace<
  UnsignedEvent,
  "kind",
  EventKind.TextNote
>;
export type TextNoteTemplate = EventTemplate<EventKind.TextNote>;
export type TextNoteTemplater = (event: SignedEvent) => TextNoteTemplate;

export class TextNoteComposer extends DefaultAgent<SignedEvent, TextNoteEvent> {
  constructor(
    pubkey: PublicKey,
    templater: TextNoteTemplater,
  ) {
    super((event) => {
      const template = templater(event);
      return TextNoteComposer.compose(pubkey, template);
    });
  }
  static compose(
    pubkey: PublicKey,
    template: TextNoteTemplate,
    relay_recommend?: RelayUrl,
  ): TextNoteEvent {
    const etags: EventTag[] =
      template.erefs?.map((id) => ["e", id, relay_recommend ?? ""]) ?? [];
    const ptags: PubKeyTag[] =
      template.prefs?.map((id) => ["p", id, relay_recommend ?? ""]) ?? [];
    return {
      ...template,
      kind: EventKind.TextNote,
      tags: [...etags, ...ptags, ...(template.tags ?? [])],
      pubkey,
      created_at: Timestamp.now,
    };
  }
}

export class ReplyComposer extends TextNoteComposer {
  constructor(
    pubkey: PublicKey,
    templater: TextNoteTemplater,
    relay_recommend?: RelayUrl,
  ) {
    super(pubkey, (event) => {
      const template = templater(event);
      const note = TextNoteComposer.compose(pubkey, template);
      return {
        ...note,
        tags: [
          ...(note.tags ?? []),
          ["e", event.id, relay_recommend ?? ""],
          ["p", event.pubkey, relay_recommend ?? ""],
        ],
      };
    });
  }
}
