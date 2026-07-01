---

description: "Task list for Phase 0: Deprecation Removal — Server Dependency Modernization"
---

# Tasks: Deprecation Removal — Server Dependency Modernization

**Input**: Design documents from `/specs/001-deprecation-removal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/matchmaking-protocol.md, quickstart.md

**Tests**: Included — the spec (FR-004, success criteria) and plan call for a Jest
suite validating the matchmaking relay's behavioral contract, and the
constitution requires this phase to lay the groundwork for gated CI testing.

**Organization**: Tasks are grouped by user story (from spec.md: US1 and US2
are both P1, US3 is P2) so each story can be implemented and validated
independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are relative to the repository root

## Path Conventions

This is the existing two-folder layout documented in plan.md's Project
Structure — `server/` (backend relay) and `game/` (front-end engine). No new
top-level directories are introduced; the only new path is `server/test/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Declare the new dependency baseline the rest of the migration builds on

- [X] T001 Update `server/package.json`: bump `express` from `3.x.x` to `^4.x`
      and `socket.io` from `0.9.x` to `^4.x`, add `jest` as a `devDependency`
      with a `"test": "jest"` script, and declare `"engines": {"node": ">=18"}`
      per research.md decisions 1, 2, 3, and 5 (`server/package.json`)
- [X] T002 [P] Run a clean `npm install` in `server/` against the updated
      manifest, regenerating `server/package-lock.json`, and confirm the
      install completes with zero errors or fatal warnings traceable to the
      direct dependencies — this is the first checkpoint for SC-001
      (`server/package-lock.json`)

**Checkpoint**: Dependency manifest declares the target versions and installs cleanly

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Rewrite the startup/connection-handling code so the server can
start at all on the new majors — nothing in any user story is testable until
this phase is done

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Rewrite the Express initialization in `server/server.js`: replace
      the removed `app.configure(function () { app.use(express.static(...)); })`
      block with the direct `app.use(express.static(__dirname + '/../game'))`
      call supported by Express 4, keeping `server.listen(55555)` unchanged
      (`server/server.js`)
- [X] T004 Rewrite the connection handling in `server/server.js`: replace the
      removed `io.sockets.on('connection', function (socket) {...})` pattern
      with the Socket.io 4 `io.on('connection', function (socket) {...})`
      pattern, preserving the existing `Responses`/`Requests` constants and
      `create-game`/`join-game` handler bodies verbatim
      (`server/server.js`, depends on T003)

**Checkpoint**: `node server.js` starts and listens on port 55555 without
throwing on removed APIs — foundation ready for user story work

---

## Phase 3: User Story 1 - Network play keeps working after the upgrade (Priority: P1) 🎯 MVP

**Goal**: A full two-player network match (connect, exchange fight events,
relay life/position updates, end on disconnect) works identically to the
pre-upgrade behavior.

**Independent Test**: Start the server, open two browser tabs, enter the same
game name in both, and confirm both clients connect, exchange events, and see
the match end correctly on disconnect — exactly per quickstart.md step 4 and
the contract in `contracts/matchmaking-protocol.md`.

### Implementation for User Story 1

- [X] T005 [US1] Update the `Network` controller's connection call in
      `game/src/mk.js` (`this._socket = io.connect();`) so it correctly
      establishes a handshake against the Socket.io 4 server and the matching
      v4 client bundle now served from `/socket.io/socket.io.js` — adjust the
      call only if the v4 client API requires it (research.md decision 2)
      (`game/src/mk.js`, depends on T004)
- [X] T006 [US1] Manually run the full two-tab network match scenario from
      `specs/001-deprecation-removal/quickstart.md` (step 4): both tabs pair,
      exchange `event`/`life-update`/`position-update` in real time, and the
      match ends correctly when one tab disconnects — confirms SC-002 and
      SC-004 (manual validation against `specs/001-deprecation-removal/quickstart.md`, depends on T005)

**Checkpoint**: User Story 1 is fully functional and independently
demonstrable — this is the MVP slice of the migration

---

## Phase 4: User Story 2 - Project runs on a current, supported Node.js/npm toolchain (Priority: P1)

**Goal**: A clean checkout installs and starts on a current Node.js LTS
runtime with no errors, fatal warnings, or removed-API crashes.

**Independent Test**: On a clean checkout with a current Node.js LTS version,
run `npm install` then `node server.js` and confirm both succeed without
errors referencing removed APIs — quickstart.md steps 1 and 3.

### Implementation for User Story 2

- [X] T007 [US2] Start the server with `node server.js` on a current Node.js
      LTS runtime and confirm it listens on port 55555 with **no** errors such
      as `app.configure is not a function` or `io.sockets.on is not a
      function` — confirms SC-003 (`server/server.js`, depends on T004; verification task, no further edits expected)
- [X] T008 [P] [US2] Review `ComoRodar.md` and update it if the install/start
      commands or the minimum supported Node.js version changed as a result of
      this migration, keeping the documented setup steps accurate per the
      constitution's Documentation principle (`ComoRodar.md`)

**Checkpoint**: User Stories 1 AND 2 both work independently — the migration's
core promise (preserve gameplay, modernize toolchain) is demonstrable

---

## Phase 5: User Story 3 - Existing matchmaking edge cases still behave correctly (Priority: P2)

**Goal**: The four documented response codes (`SUCCESS`, `GAME_EXISTS`,
`GAME_NOT_EXISTS`, `GAME_FULL`) and the pairing/relay/disconnect lifecycle
are all correct and automatically verified.

**Independent Test**: Run the Jest suite against a real in-process server +
`socket.io-client` connections and confirm every response code and lifecycle
transition in `contracts/matchmaking-protocol.md` is asserted and passes.

### Tests for User Story 3 ⚠️

> **Write this test FIRST and confirm it FAILS before the fix in T011** — this
> is the project's first red→green pair, setting the precedent the
> constitution requires CI to enforce later (Phase 4 of the grading rubric).

- [X] T009 [P] [US3] Write `server/test/matchmaking.test.js` (Jest): boot the
      real Express + Socket.io server on an ephemeral port, connect with real
      `socket.io-client` instances, and assert on every row of
      `contracts/matchmaking-protocol.md` — `SUCCESS`/`GAME_EXISTS`/
      `GAME_NOT_EXISTS`/`GAME_FULL` response codes, the `player-connected`
      notification, relay of `event`/`life-update`/`position-update`, and the
      disconnect-ends-the-match lifecycle. Run `npm test` and confirm the
      `GAME_EXISTS` assertion **fails** against the current `games.js`
      (research.md decision 4) (`server/test/matchmaking.test.js`, depends on T002, T004)

### Implementation for User Story 3

- [X] T010 [US3] Fix the pre-existing bug in
      `GameCollection.prototype.createGame` in `server/games.js`: the
      duplicate-name check reads `if (this._games[game])` where `game` is an
      undeclared/hoisted-undefined variable (always falsy), so `GAME_EXISTS`
      is never returned today — change the check to `if (this._games[id])` so
      it correctly matches the documented contract in
      `contracts/matchmaking-protocol.md` and spec FR-004
      (`server/games.js`, depends on T009)
- [X] T011 [US3] Run `npm test` and confirm the full `matchmaking.test.js`
      suite — including the now-fixed `GAME_EXISTS` assertion — passes
      (green), completing the red→green pair from T009/T010
      (`server/test/matchmaking.test.js`, depends on T009, T010)

**Checkpoint**: All three user stories are independently functional and the
matchmaking contract is now protected by an automated, repeatable suite

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final end-to-end confirmation that the whole migration meets the spec's success criteria

- [X] T012 [P] Run through `specs/001-deprecation-removal/quickstart.md`
      end-to-end (clean install → `npm test` → `node server.js` → two-tab
      match) in one pass and confirm SC-001 through SC-004 all hold
      (`specs/001-deprecation-removal/quickstart.md`)
- [X] T013 Sweep `server/server.js` and `server/games.js` for any remaining
      references to the removed `app.configure`/`io.sockets.on` patterns or
      stale comments from the Express 3 / Socket.io 0.9 implementation, per
      spec FR-002/FR-003 (`server/server.js`, `server/games.js`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (needs the new `socket.io`/
  `express` packages installed) — BLOCKS all user stories, since the server
  cannot start until `app.configure`/`io.sockets.on` are replaced
- **User Stories (Phase 3-5)**: All depend on Foundational completion
  - US1 and US2 are both P1 and have no dependency on each other — implement
    in either order or in parallel
  - US3 additionally depends on T002 (jest installed) and T004 (server
    startable), since its Jest suite boots a real server instance
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational (needs T004 so the
  server accepts connections, and a client-side update in T005)
- **User Story 2 (P1)**: Depends only on Foundational (needs T004 so the
  server starts cleanly) — independently testable without touching the client
- **User Story 3 (P2)**: Depends on Foundational (server must start) and on
  Setup's T002 (Jest available) — independently testable via the automated
  suite without a browser

### Within Each User Story

- US1: client update (T005) before manual validation (T006)
- US3: failing test (T009, red) → bug fix (T010) → passing suite (T011, green)
  — this red→green order MUST be preserved in the commit history per the
  constitution's Test- & Quality-Gated Changes principle

---

## Parallel Example: Foundational → User Stories

```bash
# After Phase 2 (Foundational) completes, US1 and US2 can proceed in parallel
# since they touch different files and have no shared dependency:
Task: "[US1] Update game/src/mk.js's io.connect() call for Socket.io 4 client compatibility"
Task: "[US2] Start the server on a current Node.js LTS runtime and confirm no removed-API errors"

# Within Setup, the install/lockfile regeneration can run alongside other
# Setup prep once the manifest is written:
Task: "[P] Run a clean npm install in server/ and regenerate package-lock.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (dependency manifest + clean install)
2. Complete Phase 2: Foundational (server starts on the new majors)
3. Complete Phase 3: User Story 1 — a full network match works end-to-end
4. **STOP and VALIDATE**: Run quickstart.md step 4 manually
5. This is already a demonstrable, gradeable slice of "Phase 0" work

### Incremental Delivery

1. Setup + Foundational → server starts cleanly on Express 4 / Socket.io 4
2. Add User Story 1 → manually validate a full match → commit ("network play
   preserved after dependency bump")
3. Add User Story 2 → confirm clean install/startup → update ComoRodar.md if
   needed → commit ("toolchain modernized: Node engines + clean install")
4. Add User Story 3 → commit the failing test (red), then the bug fix +
   passing suite (green) as the constitution-required red→green pair → commit
   ("add matchmaking contract test (failing)") then ("fix GAME_EXISTS
   detection bug; suite passes")
5. Polish → run the full quickstart end-to-end → commit ("Phase 0 complete:
   deprecation removal validated against quickstart")

Each step above corresponds to one of the constitution's required atomic,
single-concern, time-spaced commits — do not batch them.

---

## Notes

- [P] tasks touch different files and have no unmet dependencies
- [Story] labels map every user-story-phase task back to spec.md for traceability
- T010's bug fix is **not** a gameplay change (spec FR-007 scope guard) — it's
  a server relay defect that prevents the documented `GAME_EXISTS` contract
  from ever firing; fixing it is required to satisfy FR-004's "behaves
  identically to the documented protocol" requirement
- Commit after each task or logical group; the US3 red→green pair (T009→T010→T011)
  must remain as separate, sequential commits — never squashed
- Stop at any checkpoint to validate a story independently before moving on
