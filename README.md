# Lophus

> **Warning**\
> Still under development and not ready for use.

[![CI](https://github.com/hasundue/lophus/actions/workflows/ci.yml/badge.svg)](https://github.com/hasundue/lophus/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hasundue/lophus/branch/main/graph/badge.svg?token=s01IMg4nI8)](https://codecov.io/github/hasundue/lophus)

Lophus is a TypeScript library for development of [Nostr][nostr] clients and
relays, oriented to web standards and edge environments.

## Concept

- **Modular** 🔌 - NIPs and high-level interfaces are implemented as optional
  TypeScript modules, which enables you to keep an app as small as possible.
- **Portable** 📦 - The core modules are build upon
  [Web Standard APIs][web-standard-api], which makes it possible to run on
  various environment.
- **Productive** 🌊 - Declarative interfaces let you focus on the data flow
  rather than underlying logic, and strict type checking helps you to avoid
  runtime errors.
- **Compatible** 🤝 - Shares the same data structure for events as
  [nostr-tools][nostr-tools].

## Documentation

- [API Reference](https://deno.land/x/lophus/mod.ts) (WIP)
- [Lophus by Example](https://github.com/hasundue/lophus-by-example)

## Supported NIPs

- [x] [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md): Basic
      protocol
- [x] [NIP-02](https://github.com/nostr-protocol/nips/blob/master/02.md):
      Contact list
- [] [NIP-7](https://github.com/nostr-protocol/nips/blob/master/7.md):
  `window.nostr` capability for web browsers
- [] [NIP-42](https://github.com/nostr-protocol/nips/blob/master/42.md): Client
  authentication

## References

Development of Lophus is inspired by the following projects:

- [NIPs][nostr-nips] - Nostr Implementation Possibilities
- [nostr-tools][nostr-tools] - Reference implementation of the protocol in
  TypeScript
- [nostring][nostring] - A Nostr relay library written in Deno
- [Hono][hono] - A fast, lightweight, and multi-platform Web framework for edges

<!-- Links -->

[web-standard-api]: https://developer.mozilla.org/docs/Web/API
[nostr]: https://nostr.com
[nostr-nips]: https://github.com/nostr-protocol/nips
[modules]: https://github.com/hasundue/lophus/tree/main/lib
[nostr-tools]: https://github.com/nbd-wtf/nostr-tools
[nostring]: https://github.com/xbol0/nostring
[hono]: https://github.com/honojs/hono
