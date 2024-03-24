import van from "mini-van-plate/van-plate";
import { parse } from "@lophus/lib/strings";
import { DAY, HOUR, MINUTE, Timestamp } from "@lophus/lib/times";
import type { RelayLike } from "@lophus/core";
import type { NostrEvent } from "@lophus/nips";

const { img, div } = van.tags;

export class NoteRendererStream extends TransformStream<NostrEvent<1>, string> {
  constructor(readonly source: RelayLike) {
    super({
      transform: async (event, controller) => {
        controller.enqueue(await this.render(event));
      },
    });
  }
  async render(event: NostrEvent<1>) {
    const { pubkey } = event;
    const [meta] = await Array.fromAsync(
      this.source.subscribe({ kinds: [0], authors: [pubkey], limit: 1 }),
    );
    const name = parse(meta.content).name;
    return div(
      // { class: "note", id: event.id.slice(0, 4) },
      { class: "note" },
      div({ class: "name" }, name),
      img({
        class: "picture",
        src: `/app/data/pictures/${pubkey}`,
        alt: name,
      }),
      div({ class: "content" }, event.content),
      div(
        { class: "date" },
        relativeFromNow(event.created_at),
      ),
    ).render();
  }
}

function relativeFromNow(timestamp: number) {
  const d = Timestamp.now - timestamp;
  return d < MINUTE
    ? `${d}s`
    : d < HOUR
    ? Math.floor(d / MINUTE) + "m"
    : d < DAY
    ? Math.floor(d / HOUR) + "h"
    : Math.floor(d / DAY) + "d";
}
