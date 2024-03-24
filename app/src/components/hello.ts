import { VanObj } from "mini-van-plate/shared";

interface Props {
  van: VanObj;
}

export default ({ van }: Props) => {
  const { a, div, li, p, ul } = van.tags;

  const fromClient = typeof Deno === "undefined";
  return div(
    p(() => `👋Hello (from ${fromClient ? "client" : "server"})`),
    ul(
      li("🗺️World"),
      li(a({ href: "https://vanjs.org/" }, "🍦VanJS")),
    ),
  );
};
