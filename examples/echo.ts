// Echo bot
import { Relay } from "../client.ts";
import { Signer } from "../lib/signer.ts";
import { env } from "../lib/env.ts";
import { ReplyComposer } from "../lib/agents.ts";

const relay = new Relay({ url: "wss://nos.lol" });

relay.subscribe({ kinds: [1], "#p": [env.PUBLIC_KEY] })
  .pipeThrough(
    new ReplyComposer(env.PUBLIC_KEY, (event) => ({ content: event.content })),
  )
  .pipeThrough(new Signer(env.PRIVATE_KEY))
  .pipeTo(relay.publisher);
