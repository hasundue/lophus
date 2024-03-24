import van from "mini-van-plate/van-plate";

const { link, div, body, main, script, head, title } = van.tags;

export default () =>
  van.html(
    head(
      title("@lophus/app"),
      link({
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0",
      }),
      script({ type: "module", src: "app/scripts/app.js", async: true }),
    ),
    body(
      main(),
      div({ class: "modal" }),
    ),
  );
