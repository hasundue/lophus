import { assert, describe, it } from "../lib/std/testing.ts";
import { ConsoleLogger } from "./logging.ts";

describe("ConsoleLogger", () => {
  it("should be a writable stream", () => {
    const logger = new ConsoleLogger();
    assert(logger instanceof WritableStream);
  });
  it("should log to console", async () => {
    // TODO: Stub console.log
    const logger = new ConsoleLogger();
    await logger.getWriter().write("ConsoleLogger");
  });
});
