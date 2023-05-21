// Echo bot
import { Relay } from "../client.ts";
import { Signer } from "../lib/signs.ts";
import { env } from "../lib/env.ts";
import { DefaultAgent } from "../lib/agents.ts";
import { ReplyComposer } from "../lib/notes.ts";

const relay = new Relay({ url: "wss://nos.lol" });

relay.subscribe({ kinds: [1], "#p": [env.PUBLIC_KEY] }).events
  .pipeThrough(
    new DefaultAgent((event) =>
      new ReplyComposer(env.PUBLIC_KEY).compose(
        { content: event.content },
        { replyTo: event },
      )
    ),
  )
  .pipeThrough(new Signer(env.PRIVATE_KEY))
  .pipeTo(relay.publisher);
