// Echo bot
import { Relay } from "https://deno.land/x/lophus/client.ts";
import { DefaultAgent } from "https://deno.land/x/lophus/lib/agents.ts";
import { EventPublisher } from "https://deno.land/x/lophus/lib/events.ts";
import { TextNoteComposer } from "https://deno.land/x/lophus/lib/notes.ts";
import { env } from "https://deno.land/x/lophus/lib/env.ts";

const relay = new Relay("wss://nostr-dev.wellorder.net");

relay.subscribe({ kinds: [1], "#p": [env.PUBLIC_KEY] })
  .pipeThrough(new DefaultAgent((ev) => ({ content: ev.content })))
  .pipeThrough(new TextNoteComposer())
  .pipeTo(new EventPublisher(relay, env.PRIVATE_KEY));
