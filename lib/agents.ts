import {
  EventKind,
  PublicKey,
  RelayUrl,
  SignedEvent,
  UnsignedEvent,
} from "../nips/01.ts";
import { Timestamp } from "../lib/time.ts";
import { Replace } from "../lib/types.ts";

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

export type EventTemplate = Omit<UnsignedEvent, "created_at" | "pubkey">;

export type TextNoteTemplate = {
  tags?: UnsignedEvent["tags"];
  content: string;
};

export type TextNoteEvent = Replace<UnsignedEvent, "kind", EventKind.TextNote>;

export class TextNoteComposer extends DefaultAgent<SignedEvent, TextNoteEvent> {
  constructor(
    pubkey: PublicKey,
    compose: (event: SignedEvent) => TextNoteTemplate,
  ) {
    super((event) => {
      const template = compose(event);
      return {
        ...template,
        kind: EventKind.TextNote,
        tags: template.tags ?? [],
        pubkey,
        created_at: Timestamp.now,
      };
    });
  }
}

export class ReplyComposer extends TextNoteComposer {
  constructor(
    pubkey: ConstructorParameters<typeof TextNoteComposer>[0],
    compose: ConstructorParameters<typeof TextNoteComposer>[1],
    relay_recommend?: RelayUrl,
  ) {
    super(pubkey, (event) => {
      const template = compose(event);
      return {
        ...template,
        tags: [
          ...(template.tags ?? []),
          ["e", event.id, relay_recommend ?? ""],
          ["p", event.pubkey, relay_recommend ?? ""],
        ],
      };
    });
  }
}
