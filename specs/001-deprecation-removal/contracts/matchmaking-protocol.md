# Contract: Matchmaking Relay Protocol (Socket.io events)

This is the wire-level contract between a browser client (`game/src/mk.js`'s
`Network` controller) and the server relay (`server/server.js` +
`server/games.js`). **This contract MUST NOT change as a result of the
dependency migration** — every event name, payload shape, and response code
below must be observable identically by a client before and after the upgrade
(spec FR-004, FR-005; success criteria SC-002, SC-003).

## Client → Server events

| Event         | Payload          | Meaning                                            |
|---------------|------------------|----------------------------------------------------|
| `create-game` | `gameName: string` | Request to create and join a new named game       |
| `join-game`   | `gameName: string` | Request to join an existing named game            |

## Server → Client events

| Event               | Payload                                  | Meaning                                                                 |
|---------------------|------------------------------------------|-------------------------------------------------------------------------|
| `response`          | numeric code (see table below)           | Result of the most recent `create-game`/`join-game` request            |
| `player-connected`  | `playerIndex: 0`                         | Sent to the game's creator once a second player joins                  |

### Response codes

| Code | Name              | Sent when…                                                                 |
|------|-------------------|-----------------------------------------------------------------------------|
| `0`  | `SUCCESS`         | `create-game` for an unused name, or `join-game` for a game with one slot open |
| `1`  | `GAME_EXISTS`     | `create-game` for a name that already maps to an active game               |
| `2`  | `GAME_NOT_EXISTS` | `join-game` for a name with no active game                                  |
| `3`  | `GAME_FULL`       | `join-game` for a game that already has two players                        |

## Relayed peer-to-peer events (server forwards verbatim, no inspection)

Once two players are paired, the server relays the following events between
them — whatever player A emits, player B receives, and vice versa:

| Event              | Payload (opaque to the server) | Meaning                                |
|--------------------|--------------------------------|----------------------------------------|
| `event`            | fight-action data              | A gameplay action (e.g., an attack)    |
| `life-update`      | life/health data               | A fighter's life total changed          |
| `position-update`  | position data                  | A fighter's on-screen position changed  |

## Lifecycle / disconnect semantics

- A game accepts at most **two** players. The first to join is "player 0",
  the second "player 1".
- When the second player joins, player 0 receives `player-connected` with
  index `0`, and bidirectional relaying of `event`/`life-update`/
  `position-update` begins.
- If either player disconnects, the match ends immediately: the *other*
  player's connection is also terminated by the server, and the game is
  removed from the active collection (its name becomes available again).

## How this contract is verified

- **Automated**: `server/test/matchmaking.test.js` (Jest + real
  `socket.io-client` against an in-process server) drives every row in the
  Response codes table and the disconnect lifecycle — see
  [../quickstart.md](../quickstart.md) for how to run it.
- **Manual / end-to-end**: two real browser tabs completing a full match, per
  the quickstart's manual scenario — this is the only way to additionally
  confirm the bundled v4 client script and `io.connect()` call complete a real
  handshake against the upgraded server.
