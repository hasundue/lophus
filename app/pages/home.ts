import van from "mini-van-plate/van-plate";
import head from "./components/head.ts";
import header from "./components/header.ts";

const { h2, main, div, body } = van.tags;

const title = "@lophus";

export default () =>
  van.html(
    head({ title }),
    body(
      header({
        title,
        description: "A Nostr library close to the edge.",
        path: "/",
      }),
      main(
        div(
          h2("🪄 Features"),
        ),
      ),
    ),
  );
