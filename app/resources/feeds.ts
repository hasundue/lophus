import van from "mini-van-plate/van-plate";
import type { PublicKey } from "@lophus/nips/protocol";
import type { FeedSpec, ScriptSource } from "../common/config.ts";
import type { FeederModule } from "../common/types.ts";
import { Relay } from "../common/nostr.ts";
import { NoteRendererStream } from "../renderers/notes.ts";
import { radioset, select, symbol } from "./components/mod.ts";

const { a, fieldset, legend, form, div, input } = van.tags;

interface Props {
  limit: number;
  method: string;
  pubkey: PublicKey;
  id: string;
}

export default async (
  { limit, method, pubkey, id }: Props,
  body?: string,
) => {
  const feeds = JSON.parse(
    self.localStorage.getItem(`/users/${pubkey}/settings/feeds`) ?? "[]",
  ) as FeedSpec[];
  const index = id ? parseInt(id) : NaN;
  if (method !== "GET" && !isNaN(index)) {
    if (body) {
      // method === "PUT"
      feeds[index] = JSON.parse(body) as FeedSpec;
    } else {
      // method === "DELETE"
      feeds.splice(index, 1);
    }
    self.localStorage.setItem(
      `/users/${pubkey}/settings/feeds`,
      JSON.stringify(feeds),
    );
    return null;
  }
  // If an index is not given, return a list of feeds.
  if (isNaN(index)) {
    return [
      ...feeds.map((spec, i) =>
        div(
          { class: "feed", id: i },
          div({ class: "name" }, spec.name),
          div({ class: "contents" }),
          symbol({ value: "tune", href: `/app#${i}` }),
          settings(spec),
        ).render()
      ),
      // Add a hidden new feed
      div(
        { class: "feed", id: feeds.length, style: "display: none" },
        div({ class: "name" }, "new feed"),
        div({ class: "contents" }),
        symbol({ value: "tune", href: `/app#${feeds.length}` }),
        settings(),
      ).render(),
    ].join("");
  }
  // If one is given, return the specified feed.
  const feed = feeds.at(index);
  if (!feed) {
    throw new Error(`No feed found at index ${index}`);
  }
  if (isScriptSource(feed.source)) {
    const source = getScriptSourceName(feed.source);
    const mod = await import(`../feeders/${source}.ts`) as FeederModule;
    const relay = new Relay("wss://nostr.wine");
    const events = await mod.default({
      limit,
      me: pubkey,
      source: relay,
    });
    return events
      .pipeThrough(new NoteRendererStream(relay))
      .pipeThrough(new TextEncoderStream());
  }
  throw new Error(`Unknown feed source: ${feed.source}`);
};

function isScriptSource(source: FeedSpec["source"]): source is ScriptSource {
  if (Array.isArray(source)) {
    return false;
  }
  return source.startsWith("@lophus/");
}

function getScriptSourceName(source: ScriptSource): string {
  const match = source.match(/^\@lophus\/(.+)$/);
  if (!match) {
    throw new TypeError(`Invalid script source: ${source}`);
  }
  return match[1];
}

const settings = (spec?: FeedSpec) => {
  const script = spec
    ? isScriptSource(spec.source) ? getScriptSourceName(spec.source) : ""
    : "";
  const relays = spec
    ? isScriptSource(spec.source) ? [] : [spec?.source ?? []].flat()
    : [];
  return div(
    { class: "settings" },
    div({ class: "title" }, spec ? "feed" : "new feed"),
    form(
      fieldset(
        { id: "name" },
        legend("name"),
        input({
          type: "text",
          name: "name",
          value: spec?.name ?? "",
          autocomplete: "off",
          required: true,
        }),
      ),
      fieldset(
        { id: "source" },
        legend("source"),
        radioset({
          name: "type",
          options: ["relays", "script"],
          checked: script ? "script" : relays.length ? "relays" : "",
        }),
        fieldset(
          { id: "relays", style: relays.length ? "" : "display: none" },
          ...relays.map((relay, i) =>
            div(
              { class: "relay" },
              symbol({ value: "delete" }),
              input({ type: "url", value: relay, id: i + "/url" }),
            )
          ),
          div(
            { class: "relay", style: "display: none" },
            symbol({ value: "delete" }),
            input({ type: "url", id: relays.length + "/url" }),
          ),
          div(
            { class: "relay" },
            symbol({ id: "add_relay", value: "add_circle" }),
          ),
        ),
        fieldset(
          { id: "script", style: script ? "" : "display: none" },
          // TODO: Use a search input with suggestions like jsr.io
          select({
            name: "script",
            options: ["@lophus/follows"],
            selected: script,
          }),
        ),
      ),
      fieldset(
        { id: "filter" },
        legend("filter"),
        div(
          { class: "filter" },
          symbol({ id: "add_filter", value: "add_circle" }),
        ),
      ),
      input({ type: "submit", value: spec ? "Update" : "Create" }),
    ),
    a(
      { id: "remove", href: "#", style: spec ? "" : "display: none" },
      "Remove feed",
    ),
  );
};
