# Lophus

> **Warning**\
> Still under development and not ready for use.

[![CI](https://github.com/hasundue/lophus/actions/workflows/ci.yml/badge.svg)](https://github.com/hasundue/lophus/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hasundue/lophus/branch/main/graph/badge.svg?token=s01IMg4nI8)](https://codecov.io/github/hasundue/lophus)

Yet another TypeScript library for [Nostr][nostr].

## Features

- **Delightful DX** 🛠️ - Takes full advantage of [Web Streams API][streams-api].
- **Portable** 📦 - The client core (client.ts) has no dependencies on Deno or
  Node.js APIs.
- **Lightweight** 🪶 - The minified version of client core (client.min.js) is
  about 4.5 KB.
- **Modular** 🔌 - High-level interfaces and NIPs are implemented as
  [optional modules][modules], which enables you to keep an app as small as
  possible.

[nostr]: https://nostr.com
[streams-api]: https://developer.mozilla.org/en-US/docs/Web/API/Streams_API
[modules]: https://github.com/hasundue/lophus/tree/main/lib

## Documentation

- [Examples](https://github.com/hasundue/lophus/tree/main/docs/EXAMPLES.md)

## Supported NIPs

- [x] [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md): Basic
      protocol
