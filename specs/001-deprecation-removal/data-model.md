# Phase 1 Data Model: Deprecation Removal — Server Dependency Modernization

This phase introduces no persistence (Postgres persistence is Phase 2). The
entities below are the existing **in-memory** matchmaking concepts the spec's
Key Entities section names — documented here so the migration's behavior can
be validated against a precise shape, not because their structure changes.

## Game

A named matchmaking session that pairs at most two player connections and
relays gameplay messages between them until one disconnects.

| Field        | Type                              | Notes                                                                 |
|--------------|-----------------------------------|-----------------------------------------------------------------------|
| `id`         | string (the game name)            | Supplied by the creating player; unique within the active collection |
| `players`    | ordered list of ≤ 2 connections   | First entry is the creator ("player 0"), second is the joiner ("player 1") |

**Validation / state rules** (preserved from current behavior):
- A `Game` cannot be created with a name that already maps to an active game
  (`GAME_EXISTS`).
- A `Game` accepts at most two players; a third join attempt is rejected
  (`GAME_FULL`).
- Once the second player joins, the relay handlers are wired and the first
  player is notified via `player-connected`.
- When either player disconnects, the game ends: the opponent is disconnected
  too, and the `Game` is removed from the collection.

## GameCollection

The set of currently-active `Game`s, keyed by name.

| Field    | Type                          | Notes                                            |
|----------|-------------------------------|--------------------------------------------------|
| `games`  | map of game name → `Game`     | Existence check drives `GAME_EXISTS`/`GAME_NOT_EXISTS` |

**Operations** (preserved from current behavior):
- `createGame(name)` — adds a new `Game` if `name` isn't already taken;
  returns whether creation succeeded.
- `getGame(name)` — looks up a `Game` by name, or nothing if it doesn't exist.
- `removeGame(name)` — removes a `Game`, e.g. when it ends.

## Player connection

A single browser client's real-time connection to the server.

| Field        | Type                       | Notes                                                  |
|--------------|----------------------------|--------------------------------------------------------|
| `socket`     | real-time connection handle| Provided by the messaging library; associated with at most one `Game` |

**State transitions**: `connected` → `paired` (once a second player joins its
game) → `relaying` (both players exchange `event`/`life-update`/
`position-update`) → `disconnected` (game ends for both sides).

## Notes for the migration

None of the above shapes change as a result of this phase — they are the
contract this migration must keep intact. The only thing that changes is which
underlying library APIs `Game`/`GameCollection`/`server.js` use to observe
connection/disconnection and to send/receive these messages (see
[contracts/matchmaking-protocol.md](./contracts/matchmaking-protocol.md) for
the wire-level contract that must remain stable).
