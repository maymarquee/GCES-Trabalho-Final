# Quickstart: Validating the Deprecation Removal

This guide proves the migration meets the spec's success criteria
(SC-001…SC-004): a clean install on a current Node.js LTS, a fully playable
network match with unchanged behavior, no removed-API errors, and an
unchanged setup workflow.

## Prerequisites

- A current Node.js LTS runtime installed (≥ 18, matching the `engines` field
  declared in `server/package.json` per [research.md](./research.md#5-minimum-supported-nodejs-version))
- Two browser windows/tabs (for the manual network-play scenario)

## 1. Clean install (validates SC-001)

```bash
cd server
npm install
```

**Expected**: install completes with exit code 0, no errors and no fatal
deprecation warnings traceable to the server's own direct dependencies
(`express`, `socket.io`).

## 2. Run the automated relay contract suite (validates the protocol contract)

```bash
cd server
npm test
```

**Expected**: `server/test/matchmaking.test.js` passes, covering every row of
the [matchmaking protocol contract](./contracts/matchmaking-protocol.md):
`SUCCESS`/`GAME_EXISTS`/`GAME_NOT_EXISTS`/`GAME_FULL` response codes, the
`player-connected` notification, relay of `event`/`life-update`/
`position-update`, and the disconnect-ends-the-match lifecycle — all driven
through a real `socket.io-client` connection against an in-process server.

## 3. Start the server (validates SC-003 — no removed-API errors)

```bash
cd server
node server.js
```

**Expected**: the process starts and logs that it is listening, with **no**
errors such as `app.configure is not a function` or
`io.sockets.on is not a function` (the exact APIs removed by the Express
4 / Socket.io 4 upgrades — see [research.md](./research.md)).

## 4. Play a full network match across two tabs (validates SC-002, SC-004)

1. Open `http://localhost:55555` in **two** browser tabs/windows.
2. In both tabs, enter the **same** game name and connect.
3. **Expected**: the first tab shows it's waiting, the second shows it joined,
   and both receive confirmation they're paired (`player-connected` /
   equivalent on-screen state) — matching the [protocol contract](./contracts/matchmaking-protocol.md).
4. Play a short match: throw a few attacks and move around.
   **Expected**: both tabs reflect each other's actions, life totals, and
   positions in real time (the relayed `event`/`life-update`/
   `position-update` messages).
5. Close one tab.
   **Expected**: the other tab's match ends — matching today's
   disconnect-ends-the-match behavior.

Timing this end-to-end flow (install → start → both tabs paired and playing)
and confirming it takes no longer, and requires no new manual steps, compared
to the pre-migration setup is the validation for **SC-004**.

## 5. (Optional) Exercise the edge-case response codes directly

To specifically re-confirm `GAME_EXISTS`, `GAME_NOT_EXISTS`, and `GAME_FULL`
without relying on the game UI surfacing them visibly, rely on the automated
suite from step 2 — it asserts on these codes directly via the relay protocol,
which is faster and more precise than reproducing them by hand in a browser.
