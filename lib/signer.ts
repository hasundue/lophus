import { PrivateKey, SignedEvent, signEvent, UnsignedEvent } from "../types.ts";

export class Signer extends TransformStream<UnsignedEvent, SignedEvent> {
  constructor(nsec: PrivateKey) {
    super({
      transform: async (event, controller) => {
        controller.enqueue(await signEvent(event, nsec));
      },
    });
  }
}
