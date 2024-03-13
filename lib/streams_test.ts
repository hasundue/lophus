import { assertArrayIncludes, assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Distinctor } from "./streams.ts";

describe("Distinctor", () => {
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
    const values = await Array.fromAsync(
      stream.pipeThrough(new Distinctor((v) => v)),
    );
    assertEquals(values.length, 3);
    assertArrayIncludes(values, [1, 2, 3]);
  });
});
