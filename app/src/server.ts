import van from "mini-van-plate/van-plate";
import Feed from "./components/feed.ts";
import Counter from "./components/counter.ts";

const { script, link, head, title, h2, p, select, option, div, body } =
  van.tags;

export default van.html(
  head(
    title("Lophus"),
    link({ rel: "stylesheet", href: "static/style.css" }),
  ),
  body(
    script({
      type: "text/javascript",
      src: `dist/client.bundle.js`,
      defer: true,
    }),
    div(
      { id: "columns-container" },
      Feed({ van }),
      div(
        { class: "column" },
        h2("Relays"),
        div(
          { id: "counter-container" },
          h2("Basic Counter"),
          Counter({ van, id: "basic-counter", init: 0 }),
          h2("Styled Counter"),
          p(
            "Select the button style: ",
            select(
              { id: "button-style", value: "👆👇" },
              option("👆👇"),
              option("👍👎"),
              option("🔼🔽"),
              option("⏫⏬"),
              option("📈📉"),
            ),
          ),
          Counter({ van, id: "styled-counter", init: 0, buttonStyle: "👆👇" }),
        ),
      ),
    ),
  ),
);
