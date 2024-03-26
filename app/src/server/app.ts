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
    title("Lophus"),
    link({ rel: "stylesheet", href: "/style.css" }),
  ),
  body(
    script({
      type: "text/javascript",
      src: `dist/client.bundle.js`,
      defer: true,
    }),
    div(
      { id: "columns-container" },
      div({ class: "column" }),
      div({ class: "column" }),
    ),
  ),
);
