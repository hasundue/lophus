import { describe, it } from "@std/testing/bdd";
import { assertType, Has } from "@std/testing/types";
import { EventInit } from "@lophus/core/protocol";
import "./protocol.ts";

describe("EventInit<22242>", () => {
  it("can be valid", () => {
    const init = {
      kind: 22242,
      content: "",
      tags: [
        ["relay", "wss://nos.lol", "string"],
        ["challenge", "string"],
      ],
    } satisfies EventInit<22242>;
    assertType<Has<typeof init, EventInit<22242>>>(true);
  });
  it("tags should not be empty", () => {
    const init = {
      kind: 22242,
      content: "",
      // @ts-expect-error tags should not be empty
      tags: [],
    } satisfies EventInit<22242>;
    assertType<Has<typeof init, EventInit<22242>>>(false);
  });
  it('tags should have "relay" and "challenge"', () => {
    const init = {
      kind: 22242,
      content: "",
      // @ts-expect-error tags should have "relay" and "challenge"
      tags: [["relay", "wss://nos.lol"]],
    } satisfies EventInit<22242>;
    assertType<Has<typeof init, EventInit<22242>>>(false);
  });
  it('tags should not have other tags than "relay" and "challenge"', () => {
    const init = {
      kind: 22242,
      content: "",
      tags: [
        ["relay", "wss://nos.lol"],
        ["challenge", "string"],
        // @ts-expect-error tags should not have other tags than "relay" and "challenge"
        ["other", "string"],
      ],
    } satisfies EventInit<22242>;
    assertType<Has<typeof init, EventInit<22242>>>(false);
  });
});
