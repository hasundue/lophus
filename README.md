# Lophus

> **Warning**\
> Still under development and not ready for use.

Yet another TypeScript library for [Nostr][nostr].

## Features

- **Delightful DX** 🛠️ - Takes full advantage of [Web Streams API][streams-api].
- **Portable** 📦 - The client core (client.ts) has no dependencies on Deno or
  Node.js APIs.
- **Lightweight** 🪶 - The minified version of client core (client.min.js) is
  smaller than 2.7 KB.
- **Modular** 🔌 - High-level interfaces and NIPs are implemented as [optional
  modules][modules], which enables you to keep an app as small as possible.

[nostr]: https://nostr.com
[streams-api]: https://developer.mozilla.org/en-US/docs/Web/API/Streams_API
[modules]: https://github.com/hasundue/lophus/tree/main/lib

## Examples

See [./examples](https://github.com/hasundue/lophus/tree/main/examples).

## Supported NIPs

- [x] [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md): Basic
      protocol
