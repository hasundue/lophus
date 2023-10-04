// deno-lint-ignore-file no-unused-vars

import { describe, it } from "../lib/std/testing.ts";
import type { EventId, PublicKey } from "../mod.ts";
import { Timestamp } from "../lib/times.ts";
import { SubscriptionFilter, Tag } from "./01.ts";

describe("Tag", () => {
  it("valid event tag", () => {
    const tag = ["e", "" as EventId] satisfies Tag;
  });
  it("tag value of event tag should be EventId", () => {
    // @ts-expect-error: tag value of event tag should be EventId
    const tag = ["e", ""] satisfies Tag;
  });
  it("valid public key tag", () => {
    const tag = ["p", "" as PublicKey] satisfies Tag;
  });
  it("tag value of public key tag should be PublicKey", () => {
    // @ts-expect-error: tag value of public key tag should be PublicKey
    const tag = ["p", ""] satisfies Tag;
  });
});

describe("SubscriptionFilter", () => {
  it("valid", () => {
    const filter = {
      ids: ["" as EventId],
      kinds: [0, 1],
      authors: ["" as PublicKey],
      "#p": ["" as PublicKey],
      "#e": ["" as EventId],
      since: Timestamp.now,
      until: Timestamp.now,
      limit: 10,
    } satisfies SubscriptionFilter;
  });
  it("ids should be an array of EventId", () => {
    const filter = {
      // @ts-expect-error: ids should be EventId[]
      ids: [""],
    } satisfies SubscriptionFilter;
  });
  it("kinds should be an array of EventKind", () => {
    const filter = {
      // @ts-expect-error: kinds should be EventKind[]
      kinds: [""],
    } satisfies SubscriptionFilter;
  });
  it("authors should be an array of PublicKey", () => {
    const filter = {
      // @ts-expect-error: authors should be PublicKey[]
      authors: [""],
    } satisfies SubscriptionFilter;
  });
  it("tag #p should be an array of PublicKey", () => {
    const filter = {
      // @ts-expect-error: tag #p should be PublicKey[]
      "#p": [""],
    } satisfies SubscriptionFilter;
  });
  it("tag #e should be an array of EventId", () => {
    const filter = {
      // @ts-expect-error: tag #e should be EventId[]
      "#e": [""],
    } satisfies SubscriptionFilter;
  });
  it("since should be Timestamp", () => {
    const filter = {
      // @ts-expect-error: since should be Timestamp
      since: 0,
    } satisfies SubscriptionFilter;
  });
  it("until should be Timestamp", () => {
    const filter = {
      // @ts-expect-error: until should be Timestamp
      until: 0,
    } satisfies SubscriptionFilter;
  });
  it("limit should be number", () => {
    const filter = {
      // @ts-expect-error: limit should be number
      limit: "10",
    } satisfies SubscriptionFilter;
  });
});
