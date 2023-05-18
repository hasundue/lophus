import { ensureLike } from "https://deno.land/x/unknownutil/mod.ts";
import { Event } from "npm:nostr-tools@1.10.1";

export function parseWebsocketMessage(data: string): Event {
  return JSON.parse(data);
}
