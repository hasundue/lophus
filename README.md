# Lophus

> **Warning**\
> Still under development and not ready for use.

[![CI](https://github.com/hasundue/lophus/actions/workflows/ci.yml/badge.svg)](https://github.com/hasundue/lophus/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hasundue/lophus/branch/main/graph/badge.svg?token=s01IMg4nI8)](https://codecov.io/github/hasundue/lophus)

Lophus is a TypeScript library for development of [Nostr][nostr] clients and
relays, oriented to web standards and edge environments.

## Features

- **Declarative** 🌊 - Lets you focus on the data flow rather than underlying
  logic.
- **Portable** 📦 - The core modules have no dependencies on runtime APIs.
- **Lightweight** 🪶 - The minified version of client core (client.min.js) is
  about 5 KB.
- **Modular** 🔌 - High-level interfaces and NIPs are implemented as
  [optional modules][modules], which enables you to keep an app as small as
  possible.
- **Compatible** 🤝 - Shares the same data structure for events as
  [nostr-tools][nostr-tools].

## Documentation

- [API Reference](https://deno.land/x/lophus/mod.ts) (WIP)
- [Lophus by Example](https://github.com/hasundue/lophus-by-example)

## Supported NIPs

- [x] [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md): Basic
      protocol

## References

Development of Lophus is inspired by the following projects:

- [NIPs][nostr-nips] - Nostr Implementation Possibilities
- [nostr-tools][nostr-tools] - Reference implementation of the protocol in
  TypeScript
- [nostring][nostring] - A Nostr relay library written in Deno
- [Hono][hono] - A fast, lightweight, and multi-platform Web framework for edges

<!-- Links -->

[nostr]: https://nostr.com
[nostr-nips]: https://github.com/nostr-protocol/nips
[streams-api]: https://developer.mozilla.org/docs/Web/API/Streams_API
[modules]: https://github.com/hasundue/lophus/tree/main/lib
[nostr-tools]: https://github.com/nbd-wtf/nostr-tools
[nostring]: https://github.com/xbol0/nostring
[hono]: https://github.com/honojs/hono
