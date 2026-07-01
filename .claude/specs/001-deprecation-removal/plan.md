# Implementation Plan: Deprecation Removal — Server Dependency Modernization

**Branch**: `001-deprecation-removal` | **Date**: 2026-06-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-deprecation-removal/spec.md`

## Summary

Replace the unsupported `express@3.x.x` / `socket.io@0.9.x` server dependencies
with current stable major versions (Express 4.x, Socket.io 4.x), rewrite the
startup/connection-handling code that relies on APIs removed in those new
majors (`app.configure(...)`, `io.sockets.on(...)`), bump the bundled
client-side Socket.io script to a matching v4 client, and add a small Jest
unit-test suite around the matchmaking relay so the migration's behavioral
contract (response codes, pairing/relay/disconnect semantics) is verified
automatically rather than by hand. No gameplay or rendering code changes.

## Technical Context

**Language/Version**: JavaScript (Node.js). Target the current Node.js LTS
runtime (≥ 18, e.g. 20.x) — the minimum version required by Express 4.x and
Socket.io 4.x.

**Primary Dependencies**: `express` (4.x), `socket.io` (4.x) on the server;
matching `socket.io` v4 client bundle served to the browser; `jest` as a
dev-dependency for unit tests.

**Storage**: N/A — this phase introduces no persistence. (Postgres persistence
is explicitly Phase 2 / out of scope here, per the spec's Assumptions.)

**Testing**: Jest, run against an in-process server instance bound to an
ephemeral port, driven by a real `socket.io-client` connection (not mocked
sockets) so the exact handshake/protocol compatibility this migration risks is
exercised by the suite. End-to-end validation (two real browser clients
completing a match) is documented as a manual quickstart scenario, since no
browser-automation harness exists in the project yet.

**Target Platform**: Linux-based Node.js server process (matches the eventual
Docker/Alpine target of later phases); browser clients (any modern evergreen
browser, unchanged from today).

**Project Type**: Web application — existing two-half structure (`server/`
backend relay + `game/` front-end), kept as-is.

**Performance Goals**: No new performance targets. The relay must continue to
forward `event`/`life-update`/`position-update` messages with the same
real-time, low-latency characteristics as the current implementation — this is
a like-for-like migration, not an optimization.

**Constraints**: The documented Socket.io event protocol (`create-game`,
`join-game`, `response` with codes `SUCCESS`/`GAME_EXISTS`/`GAME_NOT_EXISTS`/
`GAME_FULL`, `player-connected`, `event`, `life-update`, `position-update`)
MUST remain byte-for-byte compatible from the client's point of view. No new
runtime dependencies beyond what the upgrade and its tests require.

**Scale/Scope**: Unchanged from today — a lightweight relay pairing at most two
players per named game; no load/scale targets are introduced by this phase.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Incremental & Atomic Delivery** — PASS. The work plan below is staged as
  separable commits (dependency manifest bump → server startup rewrite →
  connection-handling rewrite → client bundle bump → unit tests), each
  independently buildable/testable, matching the constitution's "single concern
  per commit" rule.
- **II. Environment Parity via Containers** — N/A for this phase (no
  Dockerfiles exist yet; that's Phase 1). The plan does not introduce anything
  that would conflict with containerization — `engines` pinning and a clean
  `npm install` are explicit goals here, which is exactly what a future
  `Dockerfile.dev` will need.
- **III. Test- & Quality-Gated Changes** — PASS. This phase adds the first unit
  tests for the project (the matchmaking relay's response codes and relay
  semantics), establishing the suite that the later CI phase (Phase 4) will
  wire into the red→green gating workflow. `package.json` gains a `test`
  script per the constitution's Technology & Modernization Constraints.
- **IV. Security by Default** — PASS (directly serves this principle). Moving
  off `express@3.x.x`/`socket.io@0.9.x` — both long-unmaintained majors with
  known-stale transitive dependency trees — is itself a security improvement;
  formal SCA/SAST tooling remains Phase 6's job.
- **V. Documentation as a Deliverable** — PASS, with a follow-up: if the
  install/start commands or minimum Node.js version change in a way that
  affects `ComoRodar.md`'s instructions, that file is updated in the same
  commit as the dependency bump (see tasks).

No violations requiring justification — Complexity Tracking is not needed.

**Post-Phase-1 re-check**: The design artifacts (`data-model.md`,
`contracts/matchmaking-protocol.md`, `quickstart.md`) introduce no new
dependencies, services, or architectural elements beyond what Technical
Context already declared — they document the *existing* in-memory entities and
wire protocol as the contract to preserve. All five gates above remain PASS
unchanged; no new Complexity Tracking entries are required.

## Project Structure

### Documentation (this feature)

```text
specs/001-deprecation-removal/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── matchmaking-protocol.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
server/
├── package.json         # dependency/engine bump: express ^4.x, socket.io ^4.x, jest devDependency, test script
├── server.js            # rewritten: Express 4 init + static middleware, socket.io v4 `io.on('connection', ...)`
├── games.js             # Game/GameCollection — relay logic unchanged in behavior, adapted only where the v4 socket API requires it
└── test/
    └── matchmaking.test.js   # NEW: Jest suite exercising create/join/full/disconnect against a real in-process server + socket.io-client

game/
├── index.html           # bundled client script tag bumped to the matching socket.io v4 client build
└── src/
    └── mk.js            # `this._socket = io.connect()` — only the transport's connection call touched, no engine/gameplay changes
```

**Structure Decision**: Keep the existing `server/` (backend relay) +
`game/` (front-end engine) split exactly as it is — there is no reason to
restructure a two-folder relay project for a dependency migration. The only
new artifact is `server/test/`, holding the Jest suite that gives this phase
(and the later CI phase) something concrete to run and gate on.

## Complexity Tracking

> No constitution gates failed — this section is intentionally empty.
