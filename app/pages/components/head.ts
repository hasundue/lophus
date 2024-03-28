import van from "mini-van-plate/van-plate";

const { title, head, link, meta } = van.tags;

export default (props: { title: string }) =>
  head(
    link({
      rel: "stylesheet",
      href: "https://cdn.simplecss.org/simple.min.css",
    }),
    meta({ charset: "utf-8" }),
    meta({
      name: "viewport",
      content: "width=device-width, initial-scale=1.0",
    }),
    title(props.title),
  );
