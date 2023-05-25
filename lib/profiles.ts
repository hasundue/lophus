import {
  EventKind,
  MetadataContent,
  PublicKey,
  UnsignedEvent,
} from "../nips/01.ts";
import type { Optional } from "../core/types.ts";
import { Timestamp } from "./times.ts";

export type ProfileContentTemplate = Optional<
  MetadataContent,
  "about" | "picture"
>;

export type ProfileEvent = UnsignedEvent<EventKind.Metadata>;

export class ProfileComposer
  extends TransformStream<ProfileContentTemplate, ProfileEvent> {
  constructor(
    readonly pubkey: PublicKey,
  ) {
    super({
      transform: (template, controller) =>
        controller.enqueue(this.compose(template)),
    });
  }
  compose(
    template: ProfileContentTemplate,
  ): UnsignedEvent<EventKind.Metadata> {
    return {
      pubkey: this.pubkey,
      created_at: Timestamp.now,
      kind: EventKind.Metadata,
      tags: [],
      content: { about: "", picture: "", ...template },
    };
  }
}
