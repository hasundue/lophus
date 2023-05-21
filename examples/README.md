## Examples

### Global feed streaming

```ts
import { Relay } from "../client.ts";

const relay = new Relay({ url: "wss://nos.lol" });
const sub = relay.subscribe({ kinds: [1] });

for await (const event of sub.events) {
  console.log(event);
}
```

### Publish a text note

```ts
import { Relay } from "../client.ts";
import { env } from "../lib/env.ts";
import { TextNoteComposer } from "../lib/agents.ts";
import { Signer } from "../lib/signer.ts";

const relay = new Relay({ url: "wss://nos.lol" });

const event = Signer.sign(
  TextNoteComposer.compose(env.PUBLIC_KEY, {
    content:
      "Hello, Nostr! This is Lophus, yet another JS/TS library for Nostr!",
  }),
  env.PRIVATE_KEY,
);

await relay.publish(event);
```

### Echo bot

```ts
import { Relay } from "../client.ts";
import { Signer } from "../lib/signer.ts";
import { env } from "../lib/env.ts";
import { ReplyComposer } from "../lib/agents.ts";

const relay = new Relay({ url: "wss://nos.lol" });

relay.subscribe({ kinds: [1], "#p": [env.PUBLIC_KEY] }).events
  .pipeThrough(
    new ReplyComposer(env.PUBLIC_KEY, (event) => ({ content: event.content })),
  )
  .pipeThrough(new Signer(env.PRIVATE_KEY))
  .pipeTo(relay.publisher);
```

### Transfer events from relay to relay

```ts
import { Relay } from "../client.ts";
import { env } from "../lib/env.ts";

new Relay({ url: "wss://relay.nostr.band" })
  .subscribe({ kinds: [1], "#p": [env.PUBLIC_KEY] }).events
  .pipeTo(new Relay({ url: "wss://nos.lol" }).publisher);
```
