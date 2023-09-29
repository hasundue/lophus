# Lophus

> **Warning**\
> Still under development and not ready for use.

[![CI](https://github.com/hasundue/lophus/actions/workflows/ci.yml/badge.svg)](https://github.com/hasundue/lophus/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hasundue/lophus/branch/main/graph/badge.svg?token=s01IMg4nI8)](https://codecov.io/github/hasundue/lophus)

Yet another TypeScript library for [Nostr][nostr]. It showcases how seamlessly
the [Web Streams API][streams-api] integrates with the protocol.

[nostr]: https://nostr.com
[streams-api]: https://developer.mozilla.org/docs/Web/API/Streams_API

## Features

- **Declarative** 🌊 - Lets you focus on the data flow rather than underlying
  logic.
- **Portable** 📦 - The client core (client.ts) has no dependencies on Deno or
  Node.js APIs.
- **Lightweight** 🪶 - The minified version of client core (client.min.js) is
  about 4.5 KB.
- **Modular** 🔌 - High-level interfaces and NIPs are implemented as
  [optional modules][modules], which enables you to keep an app as small as
  possible.
- **Compatible** 🤝 - Shares the same data structure for events as
  [nostr-tools][nostr-tools].

[modules]: https://github.com/hasundue/lophus/tree/main/lib
[nostr-tools]: https://github.com/nbd-wtf/nostr-tools

## Documentation

- [API Reference](https://deno.land/x/lophus) (WIP)
- [Lophus by Examples](https://github.com/hasundue/lophus-by-example)

## Supported NIPs

- [x] [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md): Basic
      protocol

## Acknowledgments

Development of Lophus is inspired by the following projects:

- [nostr-tools][nostr-tools] - Reference implementation of the protocol in
  TypeScript
- [nostring][nostring] - A Nostr relay library written in Deno
- [Hono][hono] - A fast, lightweight, and multi-platform Web framework for edges

[nostring]: https://github.com/xbol0/nostring
[hono]: https://github.com/honojs/hono
