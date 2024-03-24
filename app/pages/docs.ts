import van from "mini-van-plate/van-plate";
import head from "./components/head.ts";
import header from "./components/header.ts";

const { h2, main, a, div, body } = van.tags;

export default () =>
  van.html(
    head({ title: "@lophus/app" }),
    body(
      header({
        title: "@lophus/app",
        description: "A Nostr client for hackers and friends.",
        path: "/app",
      }),
      main(
        div(
          h2("🚀 Get started"),
          a(
            { class: "button", href: "/app" },
            "Login with Nostr extension",
          ),
        ),
      ),
    ),
  );
