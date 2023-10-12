import { describe, it } from "../../lib/std/testing.ts";
import { assertType, Has } from "../../lib/std/testing.ts";
import type { EventId, PublicKey } from "../../core/protocol.d.ts";
import { Timestamp } from "../../lib/times.ts";
import { SubscriptionFilter, Tag } from "../../core/protocol.d.ts";
import "./protocol.d.ts";

describe("Tag", () => {
  it("valid event tag", () => {
    const tag = ["e", "" as EventId] satisfies Tag;
    assertType<Has<typeof tag, Tag>>(true);
  });
  it("tag value of event tag should be EventId", () => {
    // @ts-expect-error: tag value of event tag should be EventId
    const tag = ["e", ""] satisfies Tag;
    assertType<Has<typeof tag, Tag>>(false);
  });
  it("valid public key tag", () => {
    const tag = ["p", "" as PublicKey] satisfies Tag;
    assertType<Has<typeof tag, Tag>>(true);
  });
  it("tag value of public key tag should be PublicKey", () => {
    // @ts-expect-error: tag value of public key tag should be PublicKey
    const tag = ["p", ""] satisfies Tag;
    assertType<Has<typeof tag, Tag>>(false);
  });
  it("valid replaceable event tag", () => {
    const pubkey = "" as PublicKey;
    const tag = ["a", `0:${pubkey}`] satisfies Tag;
    assertType<Has<typeof tag, Tag>>(true);
  });
  it("valid replaceable event tag with identifier", () => {
    const pubkey = "" as PublicKey;
    const tag = ["a", `0:${pubkey}:identifier`] satisfies Tag;
    assertType<Has<typeof tag, Tag>>(true);
  });
  it("tag value of replaceable event tag should have the specified format", () => {
    // @ts-expect-error: tag value of replaceable event tag should have the specified format
    const tag = ["a", ""] satisfies Tag;
    assertType<Has<typeof tag, Tag>>(false);
  });
  it("valid identifier tag", () => {
    const tag = ["d", ""] satisfies Tag;
    assertType<Has<typeof tag, Tag>>(true);
  });
  it("tag value of identifier tag should be string", () => {
    // @ts-expect-error: tag value of identifier tag should be string
    const tag = ["d", 0] satisfies Tag;
    assertType<Has<typeof tag, Tag>>(false);
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
    assertType<Has<typeof filter, SubscriptionFilter>>(true);
  });
  it("ids should be an array of EventId", () => {
    const filter = {
      // @ts-expect-error: ids should be EventId[]
      ids: [""],
    } satisfies SubscriptionFilter;
    assertType<Has<typeof filter, SubscriptionFilter>>(false);
  });
  it("kinds should be an array of EventKind", () => {
    const filter = {
      // @ts-expect-error: kinds should be EventKind[]
      kinds: [""],
    } satisfies SubscriptionFilter;
    assertType<Has<typeof filter, SubscriptionFilter>>(false);
  });
  it("authors should be an array of PublicKey", () => {
    const filter = {
      // @ts-expect-error: authors should be PublicKey[]
      authors: [""],
    } satisfies SubscriptionFilter;
    assertType<Has<typeof filter, SubscriptionFilter>>(false);
  });
  it("tag #p should be an array of PublicKey", () => {
    const filter = {
      // @ts-expect-error: tag #p should be PublicKey[]
      "#p": [""],
    } satisfies SubscriptionFilter;
    assertType<Has<typeof filter, SubscriptionFilter>>(false);
  });
  it("tag #e should be an array of EventId", () => {
    const filter = {
      // @ts-expect-error: tag #e should be EventId[]
      "#e": [""],
    } satisfies SubscriptionFilter;
    assertType<Has<typeof filter, SubscriptionFilter>>(false);
  });
  it("since should be Timestamp", () => {
    const filter = {
      // @ts-expect-error: since should be Timestamp
      since: 0,
    } satisfies SubscriptionFilter;
    assertType<Has<typeof filter, SubscriptionFilter>>(false);
  });
  it("until should be Timestamp", () => {
    const filter = {
      // @ts-expect-error: until should be Timestamp
      until: 0,
    } satisfies SubscriptionFilter;
    assertType<Has<typeof filter, SubscriptionFilter>>(false);
  });
  it("limit should be number", () => {
    const filter = {
      // @ts-expect-error: limit should be number
      limit: "10",
    } satisfies SubscriptionFilter;
    assertType<Has<typeof filter, SubscriptionFilter>>(false);
  });
});
