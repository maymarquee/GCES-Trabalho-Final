# Phase 0 Research: Deprecation Removal — Server Dependency Modernization

All open questions from the Technical Context have concrete decisions below;
none remain marked `NEEDS CLARIFICATION`.

## 1. Target Express major version

- **Decision**: Upgrade to Express **4.x** (latest 4.x release line).
- **Rationale**: Express 4 is the long-established, widely-deployed stable
  major with a well-documented migration path from Express 3 (the official
  "Migrating from 3.x to 4.x" guide covers exactly the `app.configure(...)`
  removal this feature must address). It minimizes migration risk while fully
  satisfying "current stable major version" — Express 5 is newer but
  introduces additional breaking changes (e.g., changed routing/path-matching
  semantics, async error propagation) that are not required to meet this
  phase's preserve-behavior goal and would expand its blast radius.
- **Alternatives considered**: Express 5.x — rejected for this phase because it
  would add migration risk unrelated to the stated goal (removing deprecated
  3.x APIs); it can be revisited independently later without blocking this
  phase.

## 2. Target Socket.io major version

- **Decision**: Upgrade to Socket.io **4.x** (latest 4.x release line) on
  *both* the server and the bundled browser client.
- **Rationale**: Socket.io 4 is the current actively-maintained major. Its
  wire protocol/parser is incompatible with the ancient 0.9.x line, and
  client/server major versions must match for the handshake to succeed — so
  the client bundle (`game/index.html`'s `<script src="/socket.io/socket.io.js">`
  and `game/src/mk.js`'s `io.connect()` call) must move in lockstep with the
  server package. Jumping any intermediate major (1.x/2.x/3.x — themselves
  deprecated) would mean doing this migration twice.
- **Alternatives considered**: Socket.io 2.x/3.x — rejected; both are already
  past end-of-support and would only postpone the same work.

## 3. Unit-testing framework for the server

- **Decision**: **Jest**.
- **Rationale**: Zero-config for plain Node.js projects, ships its own
  assertion/mocking/spy APIs (no need to wire together separate assertion +
  mocking + runner libraries), has the largest ecosystem familiarity, and its
  JSON test-result output integrates cleanly with the GitHub Actions CI work
  planned for Phase 3/4 (including the red→green commit pairing the
  constitution requires).
- **Alternatives considered**: Mocha + Chai + Sinon — more modular but requires
  assembling and configuring three packages for equivalent coverage; Tape —
  too minimal for the connection-lifecycle mocking this suite needs.

## 4. How to test the matchmaking relay without a browser

- **Decision**: Boot the real Express + Socket.io server on an ephemeral port
  inside the test process, and connect to it with real `socket.io-client`
  instances (one "test player" per simulated connection). Assert on the
  `response` codes and relayed `event`/`life-update`/`position-update`/
  `player-connected` messages exactly as a browser client would observe them.
- **Rationale**: The whole point of this migration is that the client/server
  handshake and event wiring must keep working across the major-version jump —
  a test that mocks the socket object would pass even if the real handshake
  were broken, defeating the purpose. Driving the suite through a real
  `socket.io-client` connection is the only way to catch the exact class of
  regression this phase is most at risk of introducing.
- **Alternatives considered**: Mocking `socket.io` connection objects directly
  — rejected, because it would validate `games.js`'s pairing logic in
  isolation but provide zero confidence that the v4 client and v4 server can
  actually complete a handshake — the riskiest part of this change.

## 5. Minimum supported Node.js version

- **Decision**: Declare `"engines": { "node": ">=18" }` in `server/package.json`.
- **Rationale**: Express 4.x and Socket.io 4.x both require Node.js ≥ 18 in
  their currently-maintained release lines; declaring it explicitly (FR-006)
  documents the supported runtime for contributors and gives the future
  Phase 1 `Dockerfile.dev` an unambiguous base-image version to target,
  closing the loop the constitution's Technology & Modernization Constraints
  call for.
- **Alternatives considered**: Leaving `engines` unset (today's state) —
  rejected; it provides no signal and risks a silent runtime mismatch once
  containerization picks a base image.
