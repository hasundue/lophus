import {
  assertArrayIncludes,
  assertEquals,
  describe,
  it,
} from "../lib/std/testing.ts";
import { collect } from "../lib/x/streamtools.ts";
import { distinctBy, merge } from "./streams.ts";

describe("merge", () => {
  it("merges multiple streams into one", async () => {
    const streams = [
      new ReadableStream<number>({
        start(controller) {
          controller.enqueue(1);
          controller.enqueue(2);
          controller.close();
        },
      }),
      new ReadableStream<number>({
        start(controller) {
          controller.enqueue(3);
          controller.enqueue(4);
          controller.close();
        },
      }),
    ];
    const values = await collect(merge(streams));
    assertEquals(values.length, 4);
    assertArrayIncludes(values, [1, 2, 3, 4]);
  });
});

describe("distinctBy", () => {
  it("filters out duplicate values from a stream", async () => {
    const stream = new ReadableStream<number>({
      start(controller) {
        controller.enqueue(1);
        controller.enqueue(2);
        controller.enqueue(1);
        controller.enqueue(3);
        controller.close();
      },
    });
    const values = await collect(stream.pipeThrough(distinctBy((v) => v)));
    assertEquals(values.length, 3);
    assertArrayIncludes(values, [1, 2, 3]);
  });
});
