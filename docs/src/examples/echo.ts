// Echo bot
import { Relay } from "lophus/client.ts";
import { DefaultAgent } from "lophus/lib/agents.ts";
import { EventPublisher } from "lophus/lib/events.ts";
import { TextNoteComposer } from "lophus/lib/notes.ts";
import { env } from "lophus/lib/env.ts";

const relay = new Relay("wss://nostr-dev.wellorder.net");

relay.subscribe({ kinds: [1], "#p": [env.PUBLIC_KEY] })
  .pipeThrough(new DefaultAgent((ev) => ({ content: ev.content })))
  .pipeThrough(new TextNoteComposer())
  .pipeTo(new EventPublisher(relay, env.PRIVATE_KEY));
