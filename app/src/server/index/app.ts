import van from "mini-van-plate/van-plate";
import head from "./head.ts";
import header from "./header.ts";

// deno-fmt-ignore
const { h2, main, button, div, body } = van.tags;

export default van.html(
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
        button({ id: "login-with-extension" }, "Login with Nostr extension"),
      ),
    ),
  ),
);
