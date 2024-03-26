import { VanObj } from "mini-van-plate/shared";

interface Props {
  van: VanObj;
  id: string;
  name: string;
  query: string;
}

export default ({ van, id, name, query }: Props) => {
  const { div } = van.tags;
  return div(
    { class: "feed", id, query },
    div({ class: "feed-name" }, name),
    div({ class: "feed-container" }),
  );
};
