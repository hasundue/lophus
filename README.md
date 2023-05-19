# Lophus

Yet another TypeScript library for [Nostr][nostr].

## Features

- Web standard [Streams API][streams-api]
- Lightweight (~ 4.0 KB minified)
- Robust
- Strongly typed

## Examples

### Global feed

```ts
import { connect } from "../client.ts";

const relay = connect({ url: "wss://nos.lol" });
const sub = relay.subscribe({ kinds: [1] });

for await (const event of sub.events) {
  console.log(event);
}
```

### Publish

```ts
import { connect } from "../client.ts";
import { PrivateKey, PublicKey, signEvent } from "../lib/signer.ts";
import { Timestamp } from "../lib/time.ts";

declare const nsec: PrivateKey;
const pubkey = PublicKey.from(nsec);

const relay = connect({ url: "wss://nos.lol" });

const event = signEvent({
  pubkey,
  created_at: Timestamp.now,
  kind: 1,
  tags: [],
  content:
    `Hello, Nostr! This is Lophus, yet another JS/TS library for the protocol.
https://github.com/hasundue/lophus`,
}, nsec);

await relay.publish(event);
```

### Transfer

```ts
import { connect } from "../client.ts";
import { PublicKey } from "../types.ts";

declare const pubkey: PublicKey;

const relay_src = connect({ url: "wss://relay.nostr.band", write: false });
const relay_dst = connect({ url: "wss://nos.lol", read: false });

relay_src.subscribe({ kinds: [1], "#p": [pubkey] }).pipeTo(relay_dst);
```

## Supported NIPs

- [x] [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md): Basic
      protocol

[nostr]: https://nostr.com
[streams-api]: https://developer.mozilla.org/en-US/docs/Web/API/Streams_API
