import { EventKind, MetadataContent, Optional } from "../core/types.ts";
import { EventInit } from "./events.ts";

export type ProfileContentTemplate = Optional<
  MetadataContent,
  "about" | "picture"
>;

export type ProfileEvent = EventInit<EventKind.Metadata>;

export class ProfileComposer
  extends TransformStream<ProfileContentTemplate, ProfileEvent> {
  constructor() {
    super({
      transform: (template, controller) =>
        controller.enqueue(this.compose(template)),
    });
  }
  compose(
    template: ProfileContentTemplate,
  ): EventInit<EventKind.Metadata> {
    return {
      kind: EventKind.Metadata,
      tags: [],
      content: { about: "", picture: "", ...template },
    };
  }
}
