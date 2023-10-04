import { describe, it } from "../std/testing.ts";
import { assert } from "../std/assert.ts";
import { env } from "../env.ts";
import { EventInit } from "../events.ts";

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
});
