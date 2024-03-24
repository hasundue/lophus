import { VanObj } from "mini-van-plate/shared";
import { NostrEvent } from "@lophus/nips";

interface Props {
  van: VanObj;
  event: NostrEvent<1>;
}

export default ({ van, event }: Props) => {
  const { div } = van.tags;
  return div(
    { class: "note", id: event.id },
    div(event.pubkey),
    div(event.content),
    div(new Date(event.created_at)),
  );
};
