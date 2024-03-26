# @lophus/app

_**A Nostr client for hackers and friends**_

This package drives the development of the library while providing a real-world
example of it.

## Architecture

### Features

- No HTML rendering on the front-end (= SSR)
- Backend can be remote (Deno Deploy) or local (Service Worker)
  - Remote backend for much less data transfer and CPU usage
  - Local backend for more security and censorship resistance
- Fully-customizable multi-column UI with JSON and CSS, which can be shared with
  other users

### Entry - Remote backend mode

```mermaid
sequenceDiagram

participant B as Browser
participant S as Server
participant R as Relays (Cache)

critical
    B->>+S: GET /
    S->>B: index.html
    S-->>-B: dist/index.js
    note over B: getPublicKey
end

opt Authorization
    B->>+S: GET /auth/<pubkey>
    S->>-B: <challenge>

    B->>+S: POST /auth/<pubkey> Event<22242>
    S->>-B: <TOKEN>
end
```

### Entry - Local backend (worker) mode

```mermaid
sequenceDiagram

participant B as Browser
participant W as Worker
participant S as Server
participant R as Relays

critical
    B->>+S: GET /?b=local
    S->>-B: index.html
end

critical
    B->>W: register("/worker.js")
    S->>W: dist/worker.js
end

opt
    B->>+W: GET, POST, ...
    W->>+R: REQ, EVENT, ...
    R->>-W: EVENT, ...
    W->>-B: Response<html>
end
```

### Configuration

```mermaid
sequenceDiagram

participant B as Browser
participant S as Server / Worker
participant R as Relays / Cache

note over B,S: Entry

opt
    B->>+S: POST /users/<pubkey>/config
    S->>-R: EVENT<30078>
    B->>+S: POST /users/<pubkey>/style
    S->>-R: EVENT<30078>
end
```

### Follows feed

```mermaid
sequenceDiagram

participant B as Browser
participant S as Server / Worker
participant R as Relays / Cache

note over B,S: Entry

critical
    B->>+S: GET /users/<pubkey>/app
    S->>B: app<html>
    S-->>-B: dist/app.js
end

opt Get latest events
    B->>+S: GET /users/<pubkey>/feeds/<feed>

    S->>+R: REQ { kind: 3, author: <pubkey>, limit: 1 }
    R->>-S: Event<3>

    S-)+R: REQ { kind: 1, limit: N }
    loop Receive N events
        R-->>-S: Event<1>
    end

    S->>-B: feed<html>
end

opt Event streaming
    B-)+S: GET /users/<pubkey>/feeds/<feed>/events
    S->>B: ReadableStream<html>
    S-)+R: REQ { kind: 1 }

    loop
        R-->>-S: Event<1>
        S-->>-B: note<html>
    end
end
```
