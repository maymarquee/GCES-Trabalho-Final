# Feature Specification: Deprecation Removal — Server Dependency Modernization

**Feature Branch**: `001-deprecation-removal`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "Phase 0: depreciation removal - modernize server dependencies (Express 3.x -> 4+, Socket.io 0.9.x -> 4+) and remove deprecated APIs"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Network play keeps working after the upgrade (Priority: P1)

As a player, I want to start the matchmaking server and play a network match
exactly as before, so that upgrading the server's underlying libraries does not
break the experience I already have today.

**Why this priority**: Network play is the only feature the server provides.
If matchmaking or message relaying breaks after the upgrade, the modernization
has made the product worse, not better — this is the non-negotiable baseline
the rest of the work depends on.

**Independent Test**: Start the server, open two browser tabs, enter the same
game name in both, and confirm both clients connect, exchange fight events, and
see life/position updates relayed to each other in real time — identical to the
pre-upgrade behavior.

**Acceptance Scenarios**:

1. **Given** the server is started with the modernized dependencies, **When** a
   player creates a game with a name that doesn't exist yet, **Then** the
   server confirms success and the player waits as the first participant.
2. **Given** one player has already created a game, **When** a second player
   joins using the same game name, **Then** both players are notified they are
   connected and can exchange fight events, life updates, and position updates
   for the duration of the match.
3. **Given** two players are in an active match, **When** one player
   disconnects, **Then** the other player's match ends and the game is removed
   from the active game list, matching today's behavior.

---

### User Story 2 - Project runs on a current, supported Node.js/npm toolchain (Priority: P1)

As the developer maintaining this project, I want the server's declared
dependencies and startup code to use current stable major versions, so that
`npm install` succeeds on a modern Node.js runtime without manual patching,
deprecation warnings, or unmaintained-package security exposure.

**Why this priority**: This is the literal definition of "deprecation removal"
— without it, every later phase (containerization, CI, security scanning) is
built on a foundation that a modern toolchain cannot reliably install or run.

**Independent Test**: On a clean checkout with a current Node.js LTS version,
run the server's install and start commands and confirm the process completes
without errors, fatal warnings, or the use of APIs that no longer exist in the
declared dependency versions.

**Acceptance Scenarios**:

1. **Given** a clean checkout of the repository, **When** dependencies are
   installed using a current Node.js/npm toolchain, **Then** installation
   completes successfully with no unresolved peer-dependency errors caused by
   the server's own declared versions.
2. **Given** the dependencies are installed, **When** the server is started,
   **Then** it listens for connections and serves the game's static files
   without throwing errors caused by removed or renamed APIs (e.g., no
   `app.configure is not a function` / `io.sockets.on is not a function`
   crashes).

---

### User Story 3 - Existing matchmaking edge cases still behave correctly (Priority: P2)

As a player, I want the server to still correctly reject duplicate game names,
report a missing game when joining, and report a full game when a third player
tries to join, so that the matchmaking relay remains predictable after the
underlying libraries change.

**Why this priority**: These are the only branching behaviors the relay
exposes; they must be preserved precisely, but they affect a smaller slice of
sessions than the core "two players connect and play" path (User Story 1).

**Independent Test**: Drive the matchmaking socket events directly (without a
full game UI) and confirm each of the four documented response codes
(`SUCCESS`, `GAME_EXISTS`, `GAME_NOT_EXISTS`, `GAME_FULL`) is returned for the
matching scenario.

**Acceptance Scenarios**:

1. **Given** a game with a given name already exists, **When** a player tries
   to create another game with that same name, **Then** the server responds
   that the game already exists and does not create a duplicate.
2. **Given** no game exists with a given name, **When** a player tries to join
   it, **Then** the server responds that the game does not exist.
3. **Given** a game already has two connected players, **When** a third player
   tries to join the same game name, **Then** the server responds that the game
   is full and the third player is not added to the match.

### Edge Cases

- What happens when the client's bundled real-time messaging library version no
  longer matches the server's upgraded version (protocol mismatch on connect)?
  The client transport must be updated alongside the server so the handshake
  still succeeds.
- How does the system behave if `npm install` reports vulnerabilities or
  deprecation warnings in *transitive* dependencies pulled in by the upgraded
  libraries (as opposed to the direct dependencies being targeted by this
  phase)? Those are tracked for the dedicated security-scanning phase and are
  not blocking for this phase, as long as they don't prevent install or startup.
- How does the server behave if it is started on a port that is already in use?
  This is pre-existing behavior and is out of scope for this phase — it must
  neither improve nor regress.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The server's declared dependency manifest MUST specify current
  stable major versions of its web-framework and real-time-messaging libraries
  in place of the unsupported `3.x.x` and `0.9.x` lines, so that a fresh
  install on a current Node.js LTS runtime succeeds without manual patches.
- **FR-002**: The server's startup code MUST be rewritten to use the
  initialization and static-file-serving patterns supported by the new
  web-framework major version, replacing the removed configuration-block
  pattern (`app.configure(...)`).
- **FR-003**: The server's connection-handling code MUST be rewritten to use
  the connection and event-registration patterns supported by the new
  real-time-messaging library major version, replacing the removed
  `io.sockets.on(...)` pattern.
- **FR-004**: The matchmaking relay (game creation, joining, and
  event/life-update/position-update forwarding) MUST behave identically to the
  pre-upgrade implementation from the perspective of connecting clients — same
  socket event names, same response codes, same pairing/relay/disconnect
  semantics described in the project's documented game protocol.
- **FR-005**: The browser-side real-time-messaging client (the bundled script
  the game page loads, and the connection call inside the game engine) MUST be
  updated to a version compatible with the server's upgraded library, so the
  client/server handshake continues to succeed.
- **FR-006**: The server's dependency manifest MUST declare a minimum supported
  Node.js runtime version consistent with the upgraded libraries' requirements,
  so future contributors and CI know which runtime to target.
- **FR-007**: No gameplay logic, fighter behavior, or front-end rendering may
  change as a result of this phase — the scope is strictly limited to the
  server's dependency versions, startup wiring, and the minimal client-side
  transport changes required to keep the handshake compatible.

### Key Entities

- **Game**: A named matchmaking session that pairs at most two player
  connections and relays gameplay messages between them until one disconnects.
  Identified by the game name supplied by the creating player.
- **Player connection**: A single browser client's real-time connection to the
  server, associated with at most one Game at a time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A fresh install of the server's dependencies on a current
  Node.js LTS runtime completes with zero errors and zero fatal warnings
  related to the server's own direct dependencies.
- **SC-002**: Two browser clients can complete an entire network match
  (connect, exchange fight events, observe life/position updates, and have the
  match end on disconnect) with the same observable behavior as before the
  upgrade — zero regressions in the four documented response codes
  (`SUCCESS`, `GAME_EXISTS`, `GAME_NOT_EXISTS`, `GAME_FULL`).
- **SC-003**: Zero runtime errors referencing removed APIs (e.g.,
  `app.configure`, `io.sockets.on`) appear in the server's console output
  during startup or during a full played match.
- **SC-004**: The time to go from a clean checkout to a fully playable network
  match (install + start + two clients connected) is no longer than it was
  before the upgrade — the modernization must not introduce new manual setup
  steps.

## Assumptions

- "Current stable major versions" means the latest major release lines of the
  web-framework and real-time-messaging libraries that are actively maintained
  at the time of implementation (rather than pinning to a specific patch
  release), consistent with the project constitution's modernization
  constraints.
- The documented game protocol (socket event names `create-game`, `join-game`,
  `response`, `player-connected`, `event`, `life-update`, `position-update`,
  and the four numeric response codes) is the contract to preserve; internal
  implementation details of how the relay is wired up may change freely as long
  as this contract holds.
- This phase does not include containerization, persistence, CI, linting,
  testing, fuzzing, or security-scanning setup — those are later, separately
  graded phases and are explicitly out of scope here, even though they will
  build on the modernized dependencies this phase produces.
- Front-end gameplay code (`game/src/mk.js` engine logic, fighters, arenas,
  controllers other than the transport's connection call) is assumed to be
  unaffected by this phase beyond the minimal client-library version bump
  needed for the handshake to keep working.
