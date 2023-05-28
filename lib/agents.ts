import { NostrEvent } from "../nips/01.ts";

export class DefaultAgent<T> extends TransformStream<NostrEvent, T> {
  constructor(fn: (event: NostrEvent) => T) {
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
