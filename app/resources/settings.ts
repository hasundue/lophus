import van from "mini-van-plate/van-plate";
import type { PublicKey } from "@lophus/nips/protocol";
import { RelayRecord } from "@lophus/nips/07";
import symbol from "./components/symbol.ts";

const { legend, div, fieldset, input, label, link } = van.tags;

interface Props {
  method: Request["method"];
  pubkey: PublicKey;
  id?: "feeds" | "relays" | "style";
}

export default (
  { pubkey, id }: Props,
  body?: string,
) => {
  // If body is given, just save it to localStorage
  if (body) {
    self.localStorage.setItem(
      `/users/${pubkey}/settings/${id}`,
      body,
    );
    return null;
  }
  // Otherwise, return a settings UI based on the given ID
  const style = self.localStorage.getItem(
    `/users/${pubkey}/settings/style`,
  ) ?? "@lophus/default.css";
  if (id === "style") {
    return link({
      rel: "stylesheet",
      href: style.replace("@lophus/", "/app/styles/"),
    }).render();
  }
  const relays = JSON.parse(
    self.localStorage.getItem(`/users/${pubkey}/settings/relays`) ?? "{}",
  ) as RelayRecord;
  // The settings window
  return div(
    { class: "settings" },
    div({ class: "title" }, "settings"),
    fieldset(
      { id: "style" },
      legend("stylesheet"),
      input({ name: "style", value: style }),
    ),
    fieldset(
      { id: "relays" },
      legend("preferred relays"),
      Object.entries(relays).map(([url, opts], i) =>
        div(
          { class: "relay" },
          symbol({ value: "delete" }),
          input({ type: "url", value: url, id: i + "/url" }),
          label(
            input({ type: "checkbox", checked: opts.read, id: i + "/read" }),
            "read",
          ),
          label(
            input({ type: "checkbox", checked: opts.write, id: i + "/write" }),
            "write",
          ),
        )
      ),
      div({ class: "relay" }, symbol({ value: "add_circle" })),
    ),
  ).render();
};
