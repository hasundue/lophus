import van from "mini-van-plate/van-plate";
import symbol from "./components/symbol.ts";

const { header } = van.tags;

export default () =>
  header(
    symbol({ id: "new_note", value: "note_add", href: "/app#new_note" }),
    symbol({ id: "new_feed", value: "add", href: "/app#new_feed" }),
    symbol({ value: "settings", href: "/app#settings" }),
  ).render();
