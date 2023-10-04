import { describe, it } from "../lib/std/testing.ts";
import { assert } from "../lib/std/assert.ts";
import type { EventId, PublicKey } from "../mod.ts";
import { Timestamp } from "../lib/times.ts";
import { SubscriptionFilter } from "./01.ts";

describe("SubscriptionFilter", () => {
  it("valid", () => {
    const filter = {
      ids: ["" as EventId],
      kinds: [0, 1],
      authors: ["" as PublicKey],
      "#p": ["" as PublicKey],
      "#e": ["" as EventId],
      "#Z": [""],
      since: Timestamp.now,
      until: Timestamp.now,
      limit: 10,
    } satisfies SubscriptionFilter;
    assert(filter);
  });
  it("ids should be an array of EventId", () => {
    const filter = {
      // @ts-expect-error: ids should be EventId[]
      ids: [""],
    } satisfies SubscriptionFilter;
    assert(filter);
  });
  it("kinds should be an array of EventKind", () => {
    const filter = {
      // @ts-expect-error: kinds should be EventKind[]
      kinds: [""],
    } satisfies SubscriptionFilter;
    assert(filter);
  });
  it("authors should be an array of PublicKey", () => {
    const filter = {
      // @ts-expect-error: authors should be PublicKey[]
      authors: [""],
    } satisfies SubscriptionFilter;
    assert(filter);
  });
  it("tag #p should be an array of PublicKey", () => {
    const filter = {
      // @ts-expect-error: tag #p should be PublicKey[]
      "#p": [""],
    } satisfies SubscriptionFilter;
    assert(filter);
  });
  it("tag #e should be an array of EventId", () => {
    const filter = {
      // @ts-expect-error: tag #e should be EventId[]
      "#e": [""],
    } satisfies SubscriptionFilter;
    assert(filter);
  });
  it("since should be Timestamp", () => {
    const filter = {
      // @ts-expect-error: since should be Timestamp
      since: 0,
    } satisfies SubscriptionFilter;
    assert(filter);
  });
  it("until should be Timestamp", () => {
    const filter = {
      // @ts-expect-error: until should be Timestamp
      until: 0,
    } satisfies SubscriptionFilter;
    assert(filter);
  });
  it("limit should be number", () => {
    const filter = {
      // @ts-expect-error: limit should be number
      limit: "10",
    } satisfies SubscriptionFilter;
    assert(filter);
  });
});
