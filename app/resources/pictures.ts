import sharp from "sharp";
import { parse } from "@lophus/lib/strings";
import type { PublicKey } from "@lophus/nips/protocol";
import { nostr } from "../common/nostr.ts";

interface Props {
  pubkey: PublicKey;
}

export default async ({ pubkey }: Props): Promise<Response> => {
  const kv = await Deno.openKv();
  const { value } = await kv.get<Uint8Array>(["pictures", pubkey]);
  if (value) {
    return new Response(value, {
      headers: { "Content-Type": "image/webp" },
    });
  }
  const meta = await nostr.get({ kinds: [0], authors: [pubkey] });
  if (!meta) {
    return new Response(null, { status: 404 });
  }
  const buffer = await fetch(parse(meta.content).picture)
    .then((res) => res.arrayBuffer());
  const resized = await sharp(buffer).resize(256, 256).webp().toBuffer();
  await kv.set(["pictures", pubkey], new Uint8Array(resized));
  return new Response(resized, {
    headers: { "Content-Type": "image/webp" },
  });
};
