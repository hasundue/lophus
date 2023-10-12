import { describe, it } from "../../lib/std/testing.ts";
import { assertType, Has } from "../../lib/std/testing.ts";
import { EventInit } from "../../lib/events.ts";
import type { PublicKey } from "../../core/protocol.d.ts";
import "./protocol.d.ts";

describe("EventInit<3>", () => {
  it("valid", () => {
    const init = {
      kind: 3,
      content: "",
      tags: [
        ["p", "test" as PublicKey, "wss://nos.lol", "string"],
      ],
    } satisfies EventInit<3>;
    assertType<Has<typeof init, EventInit<3>>>(true);
  });
  it('tag name should be "p"', () => {
    const init = {
      kind: 3,
      content: "",
      tags: [
        // @ts-expect-error: tag name should be "p"
        ["e", "test" as PublicKey, "wss://nos.lol", "string"],
      ],
    } satisfies EventInit<3>;
    assertType<Has<typeof init, EventInit<3>>>(false);
  });
  it("content should be empty string", () => {
    const init = {
      kind: 3,
      // @ts-expect-error: content should be empty string
      content: "string",
      tags: [
        ["p", "test" as PublicKey, "wss://nos.lol", "string"],
      ],
    } satisfies EventInit<3>;
    assertType<Has<typeof init, EventInit<3>>>(false);
  });
});
