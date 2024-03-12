import { assert, assertEquals } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { ConsoleLogger } from "./logging.ts";

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
