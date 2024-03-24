import { describe, it } from "@std/testing/bdd";
import { assert, assertFalse } from "@std/assert";
import { isLimited } from "./filters.ts";
import { Timestamp } from "@lophus/lib/times";
import { HOUR } from "@lophus/lib/times";

describe("isLimited", () => {
  it("should return true", () => {
    assert(isLimited(
      [],
    ));
    assert(isLimited(
      { limit: 10 },
    ));
    assert(isLimited(
      { since: Timestamp.now, limit: 10 },
    ));
    assert(isLimited(
      [
        { limit: 10 },
        { limit: 1 },
      ],
    ));
  });
  it("should return false", () => {
    assertFalse(isLimited({}));
    assertFalse(isLimited(
      { since: Timestamp.past(HOUR) },
    ));
    assertFalse(isLimited(
      { until: Timestamp.future(HOUR) },
    ));
    assertFalse(isLimited([
      { since: Timestamp.now },
      { limit: 10 },
    ]));
  });
});
