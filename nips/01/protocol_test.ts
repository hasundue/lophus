import { describe, it } from "@std/testing/bdd";
import { assertType, Has } from "@std/testing/types";
import type {
  EventFilter,
  EventId,
  PublicKey,
  Tag,
} from "@lophus/core/protocol";
import { Timestamp } from "@lophus/lib/times";
import "./protocol.ts";

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
    } satisfies EventFilter;
    assertType<Has<typeof filter, EventFilter>>(true);
  });
  it("ids should be an array of EventId", () => {
    const filter = {
      // @ts-expect-error: ids should be EventId[]
      ids: [""],
    } satisfies EventFilter;
    assertType<Has<typeof filter, EventFilter>>(false);
  });
  it("kinds should be an array of EventKind", () => {
    const filter = {
      // @ts-expect-error: kinds should be EventKind[]
      kinds: [""],
    } satisfies EventFilter;
    assertType<Has<typeof filter, EventFilter>>(false);
  });
  it("authors should be an array of PublicKey", () => {
    const filter = {
      // @ts-expect-error: authors should be PublicKey[]
      authors: [""],
    } satisfies EventFilter;
    assertType<Has<typeof filter, EventFilter>>(false);
  });
  it("tag #p should be an array of PublicKey", () => {
    const filter = {
      // @ts-expect-error: tag #p should be PublicKey[]
      "#p": [""],
    } satisfies EventFilter;
    assertType<Has<typeof filter, EventFilter>>(false);
  });
  it("tag #e should be an array of EventId", () => {
    const filter = {
      // @ts-expect-error: tag #e should be EventId[]
      "#e": [""],
    } satisfies EventFilter;
    assertType<Has<typeof filter, EventFilter>>(false);
  });
  it("since should be Timestamp", () => {
    const filter = {
      // @ts-expect-error: since should be Timestamp
      since: 0,
    } satisfies EventFilter;
    assertType<Has<typeof filter, EventFilter>>(false);
  });
  it("until should be Timestamp", () => {
    const filter = {
      // @ts-expect-error: until should be Timestamp
      until: 0,
    } satisfies EventFilter;
    assertType<Has<typeof filter, EventFilter>>(false);
  });
  it("limit should be number", () => {
    const filter = {
      // @ts-expect-error: limit should be number
      limit: "10",
    } satisfies EventFilter;
    assertType<Has<typeof filter, EventFilter>>(false);
  });
});
