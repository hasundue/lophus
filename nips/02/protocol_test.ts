import { describe, it } from "@std/testing/bdd";
import { assertType, Has } from "@std/testing/types";
import { EventInit } from "../../std/events.ts";
import type { EventId, PublicKey } from "../../core/protocol.ts";
import "./protocol.ts";

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
        ["e", "test" as EventId, "wss://nos.lol", "string"],
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
