import { FeederProps } from "../common/types.ts";
import { parse } from "@lophus/nips/02";

export default async ({ source, me, limit, id }: FeederProps) => {
  const [event] = await Array.fromAsync(
    source.subscribe({ kinds: [3], authors: [me], limit: 1 }),
  );
  const authors = event.tags
    .filter((it) => it[0] === "p") // Need this because of some clients
    .map((it) => parse(it).pubkey);
  return source.subscribe({ kinds: [1], authors, limit }, { id });
};
