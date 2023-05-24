import { describe, it } from "../lib/std/testing.ts";
import { broadcast } from "./streams.ts";

describe("broadcast", () => {
  it("should broadcast messages to multiple targets", () => {
    const source = new ReadableStream<number>({
      start: (controller) => {
        controller.enqueue(1);
        controller.enqueue(2);
        controller.enqueue(3);
        controller.close();
      },
    });

    const targets = [
      new WritableStream<number>({
        write: (msg) => {
          console.log("target1", msg);
        },
      }),
      new WritableStream<number>({
        write: (msg) => {
          console.log("target2", msg);
        },
      }),
    ];

    broadcast(source, targets);
  });
});
