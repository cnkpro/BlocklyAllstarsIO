# Roadmap

Work items for reviving Blockly.IO, roughly in priority order. Mark an item `[x]`
when it is done and add a one-line note (date, commit) under "Log".

## Backlog
- [x] End-of-game score screen: fill the empty `#stats` panel (land %, kills, time alive, rank) before returning to the login screen (upstream issue #1)
- [ ] Centralize magic numbers (CELL_WIDTH, SPEED, ANIMATE_FRAMES, NEW_PLAYER_LAG, ...) in `game-core/game-consts.js` (upstream issue #2)
- [ ] Replace the "Todo: replace ^^^ with a picture" title placeholder with a proper logo/title
- [ ] Mobile support: swipe / on-screen controls and a responsive canvas (upstream issue #14)
- [ ] Re-enable client/server frame verification in `client.js` (currently commented out) and resync on mismatch
- [ ] Keep kill count and zoom when the client re-requests a frame (TODO in `client-modes/user-mode.js`)
- [ ] Death animation: tail rewinds / player explodes (TODO in `user-mode.js`)
- [ ] Server: support more than one game room instead of `games[0]` only
- [ ] Add unit tests for tail filling (`fillTail` / `floodFill`) and Color
- [ ] Add an ESLint config and fix warnings (implicit globals like `steps`, `distWeights` in bot-mode.js)

## Log
- 2026-10-24: Revived project, fixed crashes and gameplay bugs, upgraded socket.io to v4, added `npm test` (6a3abca)
- 2026-10-24 18:05: End-of-game score screen: `#stats` now shows final/best land %, kills, best rank and time alive (`client-modes/stats.js`, unit-tested); not checked in a browser yet (preview server was declined during the automated run)
