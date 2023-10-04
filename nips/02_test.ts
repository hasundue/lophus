import { describe, it } from "../lib/std/testing.ts";
import { assert } from "../lib/std/assert.ts";
import { env } from "../lib/env.ts";
import { EventInit } from "../lib/events.ts";
import "./02.ts";

describe("EventInit<3>", () => {
  it("valid", () => {
    const init = {
      kind: 3,
      content: "",
      tags: [
        ["p", env.PUBLIC_KEY, "wss://nos.lol", "string"],
      ],
    } satisfies EventInit<3>;
    assert(init);
  });
  it('tag name should be "p"', () => {
    const init = {
      kind: 3,
      content: "",
      tags: [
        // @ts-expect-error: tag name should be "p"
        ["e", env.PUBLIC_KEY, "wss://nos.lol", "string"],
      ],
    } satisfies EventInit<3>;
    assert(init);
  });
  it("content should be empty string", () => {
    const init = {
      kind: 3,
      // @ts-expect-error: content should be empty string
      content: "string",
      tags: [
        ["p", env.PUBLIC_KEY, "wss://nos.lol", "string"],
      ],
    } satisfies EventInit<3>;
    assert(init);
  });
});
