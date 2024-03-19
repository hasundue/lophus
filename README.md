# Lophus

> :construction: Still under development and not ready for use.

[![CI](https://github.com/hasundue/lophus/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/hasundue/lophus/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hasundue/lophus/branch/main/graph/badge.svg?token=s01IMg4nI8)](https://codecov.io/github/hasundue/lophus)

Lophus is an experimental TypeScript library for development of [Nostr][nostr]
clients and relays, oriented to web standards and edge environments.

## Features

- **Modular** 🔌 - NIPs and high-level interfaces are implemented as optional
  TypeScript modules, which makes your apps as small as possible.
- **Fast** ⚡ - Carefully designed to be performant. Fully asynchronous and
  non-blocking. Use native code of a runtime via [Web APIs][web-apis].
- **Portable** 📦 - No runtime-specific code or external dependencies in the
  core modules so that it can work on various platforms.
- **Type-safe** 🛡️ - Thoroughly typed with insanity.
- **Compatible** 🤝 - Shares the same data structure for events as
  [nostr-tools][nostr-tools].

## Project Structure

### [@lophus/nips](https://github.com/hasundue/lophus/tree/main/nips)

Provides a set of modules that implement the Nostr protocol and its extensions.
Supposed to be the entry point for most developers who want to use Lophus.

### [@lophus/std](https://github.com/hasundue/lophus/tree/main/std)

Provides high-level interfaces and utilities, and functionalities that depends
on third-party libraries.

### [@lophus/core](https://github.com/hasundue/lophus/tree/main/core)

Contains the core modules that implement the basic architecture of Lophus. Used
for implementation of NIPs, or possibly your own Nostr-like protocols.

### [@lophus/lib](https://github.com/hasundue/lophus/tree/main/lib)

General-purpose modules that are developed for Lophus, but not directly related
to the Nostr protocol. You may use them in any TypeScript project.

### [Benchmarks](https://github.com/hasundue/lophus/tree/main/bench)

Performance tests for Lophus and other Nostr libraries. Highly experimental.

## Sponsors

### [Soapbox](https://soapbox.pub)

Software for the next generation of social media.

![Soapbox](https://avatars.githubusercontent.com/u/99939943?s=200&v=4)

## References

Development of Lophus is inspired by the following projects:

- [NIPs][nostr-nips] - Nostr Implementation Possibilities
- [nostr-tools][nostr-tools] - Reference implementation of the protocol in
  TypeScript
- [nostring][nostring] - A Nostr relay library written in Deno
- [Hono][hono] - A fast, lightweight, and multi-platform Web framework for edges

<!-- Links -->

[web-apis]: https://developer.mozilla.org/docs/Web/API
[nostr]: https://nostr.com
[nostr-nips]: https://github.com/nostr-protocol/nips
[modules]: https://github.com/hasundue/lophus/tree/main/lib
[nostr-tools]: https://github.com/nbd-wtf/nostr-tools
[nostring]: https://github.com/xbol0/nostring
[hono]: https://github.com/honojs/hono
