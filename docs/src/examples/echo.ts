// Echo bot
import { Relay } from "../../../client.ts";
import { DefaultAgent } from "../../../lib/agents.ts";
import { EventPublisher } from "../../../lib/events.ts";
import { TextNoteComposer } from "../../../lib/notes.ts";
import { env } from "../../../lib/env.ts";

const relay = new Relay("wss://nostr-dev.wellorder.net");

relay.subscribe({ kinds: [1], "#p": [env.PUBLIC_KEY] })
  .pipeThrough(new DefaultAgent((ev) => ({ content: ev.content })))
  .pipeThrough(new TextNoteComposer())
  .pipeTo(new EventPublisher(relay, env.PRIVATE_KEY));
