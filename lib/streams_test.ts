import { assert, assertArrayIncludes, assertEquals } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { ConsoleLogger, Distinctor } from "@lophus/lib/streams";

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

describe("ConsoleLogger", () => {
  let output = "";

  beforeEach(() => {
    globalThis.console = new Proxy(globalThis.console, {
      get: () => {
        return (data: unknown) => {
          output += data;
        };
      },
    });
  });

  it("should be a writable stream", () => {
    const logger = new ConsoleLogger();
    assert(logger instanceof WritableStream);
  });

  it("should log to console", async () => {
    const logger = new ConsoleLogger();
    await logger.getWriter().write("ConsoleLogger");
    assertEquals(output, "ConsoleLogger");
  });
});
