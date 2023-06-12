## Examples

### Global timeline streaming

```ts
import { Relay } from "../../../client.ts";
import { Timestamp } from "../../../lib/times.ts";

new Relay("wss://nos.lol")
  .subscribe({ kinds: [1], since: Timestamp.now })
  .pipeTo(new WritableStream({ write: (ev) => console.log(ev) }));
```

### Stream from multiple relays with a relay pool

```ts
import { RelayPool } from "../../../lib/pools.ts";
import { Timestamp } from "../../../lib/times.ts";

new RelayPool("wss://nos.lol", "wss://relay.nostr.band")
  .subscribe({ kinds: [1], since: Timestamp.now })
  .pipeTo(new WritableStream({ write: (ev) => console.log(ev) }));
```

### Publish a text note

```ts
import { Relay } from "../../../client.ts";
import { EventPublisher } from "../../../lib/events.ts";
import { env } from "../../../lib/env.ts";

const relay = new Relay("wss://nos.lol");

new EventPublisher(relay, env.PRIVATE_KEY)
  .publish({
    kind: 1,
    content:
      "Hello, Nostr! This is Lophus, yet another JS/TS library for Nostr!",
  })
  .then(relay.close);
```

### Echo bot

```ts
import { Relay } from "../../../client.ts";
import { Transformer } from "../../../lib/streams.ts";
import { EventPublisher } from "../../../lib/events.ts";
import { env } from "../../../lib/env.ts";

const relay = new Relay("wss://nostr-dev.wellorder.net");

relay.subscribe({ kinds: [1], "#p": [env.PUBLIC_KEY] })
  .pipeThrough(new Transformer((ev) => ({ kind: 1, content: ev.content })))
  .pipeTo(new EventPublisher(relay, env.PRIVATE_KEY));
```

### Transfer your notes from relay to relay

```ts
import { Relay } from "../../../client.ts";
import { EventPublisher } from "../../../lib/events.ts";
import { env } from "../../../lib/env.ts";

new Relay("wss://relay.nostr.band")
  .subscribe({
    kinds: [1],
    authors: [env.PUBLIC_KEY],
  }, { realtime: false })
  .pipeTo(new EventPublisher(new Relay("wss://nos.lol"), env.PRIVATE_KEY));
```
