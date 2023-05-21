import { SignedEvent } from "../nips/01.ts";

export class DefaultAgent<T> extends TransformStream<SignedEvent, T> {
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
