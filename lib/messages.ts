import type { PublishMessage, SignedEvent } from "../client.ts";

export class MessagePacker
  extends TransformStream<SignedEvent, PublishMessage> {
  constructor() {
    super({
      transform(event, controller) {
        controller.enqueue(MessagePacker.pack(event));
      },
    });
  }
  static pack(event: SignedEvent): PublishMessage {
    return ["EVENT", event];
  }
}
