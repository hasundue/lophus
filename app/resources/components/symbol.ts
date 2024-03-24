import van from "mini-van-plate/van-plate";

const { a, span, div } = van.tags;

interface Props {
  id?: string;
  href?: string;
  value: string;
}

export default ({ id, href, value }: Props) => {
  return div(
    { class: "symbol", id: id ?? value },
    href
      ? a(
        { class: "symbol", href },
        span({ class: "material-symbols-outlined" }, value),
      )
      : span({ class: "material-symbols-outlined" }, value),
  );
};
