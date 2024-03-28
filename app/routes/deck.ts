import van from "mini-van-plate/van-plate";
//import { Config, FeedSpec } from "../config.ts";
// import Feed from "../components/feeds.ts";

const { script, link, head, title, div, body } = van.tags;

/**
const config = JSON.parse(
  await Deno.readTextFile("./static/config.json"),
) as Config;

const feeds = config.columns.filter((it) => it.class === "feed") as FeedSpec[];
*/

export default van.html(
  head(
    title("@lophus/app"),
    link({ rel: "stylesheet", href: "styles/default.css" }),
    script({ type: "module", src: "scripts/deck.js", async: true }),
  ),
  body(
    div({ class: "column" }),
  ),
);
