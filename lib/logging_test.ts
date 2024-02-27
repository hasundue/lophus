import { beforeEach, describe, it } from "../lib/std/testing.ts";
import { assertEquals } from "../lib/std/assert.ts";
import { ConsoleLogger } from "./logging.ts";
import { assert } from "../lib/std/assert.ts";

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
