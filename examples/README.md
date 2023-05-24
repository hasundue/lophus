## Examples

### Global timeline streaming

```ts
import { Relay } from "../client.ts";
import { Timestamp } from "../lib/times.ts";

new Relay({ url: "wss://nos.lol" })
  .subscribe([{ kinds: [1], since: Timestamp.now }])
  .pipeTo(new WritableStream({ write: (ev) => console.log(ev) }));
```

### Publish a text note

```ts
import { Relay } from "../client.ts";
import { env } from "../lib/env.ts";
import { TextNoteComposer } from "../lib/notes.ts";
import { Signer } from "../lib/signs.ts";

const relay = new Relay({ url: "wss://nos.lol" });

const event = new Signer(env.PRIVATE_KEY).sign(
  new TextNoteComposer(env.PUBLIC_KEY).compose({
    content:
      "Hello, Nostr! This is Lophus, yet another JS/TS library for Nostr!",
  }),
);
await relay.publish(event);
```

### Echo bot

```ts
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
```

### Transfer events from relay to relay

```ts
import { Relay } from "../client.ts";
import { env } from "../lib/env.ts";

new Relay({ url: "wss://relay.nostr.band" })
  .subscribe({ kinds: [1], "#p": [env.PUBLIC_KEY] }).events
  .pipeTo(new Relay({ url: "wss://nos.lol" }).publisher);
```
