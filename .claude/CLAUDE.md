# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

This is an individual assignment for the UnB course "Gerência de Configuração e Evolução de Software" (GCES, 2026-1). The base application is **mk.js**, an old (deprecated) HTML5 Canvas fighting game with a Node.js/Express + Socket.io backend. The graded work is *not* primarily about the game itself — it's about modernizing, containerizing, testing, securing, and deploying it (see "Grading phases" below). `README.md` contains the full grading rubric (10 phases, 1.0 point each); `ComoRodar.md` documents how to run the game and its options object.

## Running the project (current state — pre-modernization)

There is no Docker setup yet. To run locally:

```bash
cd server
npm install
node server.js
```

The server listens on port `55555` (hardcoded in `server/server.js`) and serves the static `game/` directory plus a Socket.io endpoint. Open `http://localhost:55555` in a browser; both players must enter the same game name to connect for network play. The game can also be played without a server by opening `game/index.html` directly (Basic/Multiplayer modes only — Network mode requires the server).

There are currently **no build, lint, or test scripts** configured (`server/package.json` has no `scripts` section, and there is no root-level `package.json`, lint config, or test framework). Setting these up is itself part of the graded work (Phases 3-5).

## Architecture

### Two independent halves
- **`game/`** — pure front-end, vanilla JS + HTML5 Canvas, no build step. Loaded directly via `<script>` tags in `game/index.html`.
  - `game/src/mk.js` — the game engine: arenas, fighters, controllers (`Basic`, `Network`, `Multiplayer`, `WebcamInput`), the `mk.start(options)` entry point, and the Socket.io transport wrapper used by the `Network` controller.
  - `game/src/movement.js` — webcam-based gesture/movement recognition (used by the `WebcamInput`/Network modes).
  - `game/styles/`, `game/images/{arenas,fighters}/` — static assets.
- **`server/`** — minimal matchmaking relay for network play.
  - `server/server.js` — Express app + Socket.io server on port 55555; serves `../game` as static files and wires up `create-game`/`join-game` socket events.
  - `server/games.js` — `Game` and `GameCollection`: pairs two sockets into a game and relays `event`/`life-update`/`position-update` messages between them; ends the game on disconnect.

The server does **not** run any game logic — it's purely a relay that pairs two browser clients and forwards their Socket.io messages to each other. All fight simulation happens client-side in `mk.js`.

### Outdated dependencies (must be modernized)
`server/package.json` currently pins `express: 3.x.x` and `socket.io: 0.9.x` — both ancient major versions with incompatible APIs (e.g. `app.configure(...)` is Express 3 syntax, removed in Express 4+; `io.sockets.on(...)` reflects the old Socket.io 0.9 API). Upgrading these to current stable versions and adapting `server.js`/`games.js`/the client-side transport accordingly is an explicit requirement of the assignment ("Modernização" in `README.md`).

### Game protocol (relevant when touching networking code)
Socket.io events exchanged between client and server:
- Client → server: `create-game`, `join-game` (both take a game name string)
- Server → client: `response` (numeric code: `SUCCESS`/`GAME_EXISTS`/`GAME_NOT_EXISTS`/`GAME_FULL`), `player-connected`
- Relayed peer-to-peer (server just forwards): `event`, `life-update`, `position-update`

## Grading phases (drives prioritization of work in this repo)

The 11 phases in `README.md` build on each other roughly in this order: depreciation removal → dev containerization → docker-compose + Postgres persistence → CI build/lint → CI unit tests → fuzzing → SAST/SCA security scanning → SonarCloud quality gating → prod containerization (multi-stage Alpine + Nginx) → Kubernetes/Terraform → CD + HTTPS via cert-manager. When asked to add CI, infra, or tooling, check which phase it corresponds to and keep commits atomic/incremental — the rubric explicitly penalizes large batched commits made all at once near a deadline.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/003-docker-compose-dev/plan.md`
<!-- SPECKIT END -->
