import { describe, it } from "../../lib/std/testing.ts";
import { assertType, Has } from "../../lib/std/testing.ts";
import { EventInit } from "../../lib/events.ts";
import "./protocol.d.ts";

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
});
