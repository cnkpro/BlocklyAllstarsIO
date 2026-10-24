# Roadmap

Work items for reviving Blockly.IO, roughly in priority order. Mark an item `[x]`
when it is done and add a one-line note (date, commit) under "Log".

## Backlog
- [x] End-of-game score screen: fill the empty `#stats` panel (land %, kills, time alive, rank) before returning to the login screen (upstream issue #1)
- [x] Centralize magic numbers (CELL_WIDTH, SPEED, ANIMATE_FRAMES, NEW_PLAYER_LAG, ...) in `game-core/game-consts.js` (upstream issue #2)
  - Left as-is: client-only layout constants in `user-mode.js` (bar sizes, bounce/drop animation) and the 60 fps / timeout values in `client.js`; move them too if the server ever needs them
- [x] Replace the "Todo: replace ^^^ with a picture" title placeholder with a proper logo/title
  - Done as a CSS tile logo (no image). Needs a look in a real browser; swap in an image later if wanted
- [ ] Mobile support: swipe / on-screen controls and a responsive canvas (upstream issue #14)
  - Done: swipe controls (`client-modes/swipe.js`, wired in `game-client.js`). Remaining: the top UI bar and leaderboard use fixed 400px bars and overflow on phones; maybe on-screen arrow buttons; test on a real touch device
- [x] Re-enable client/server frame verification in `client.js` (currently commented out) and resync on mismatch
- [x] Keep kill count and zoom when the client re-requests a frame (TODO in `client-modes/user-mode.js`)
  - No automated test for the resync path yet (the client socket is private); worth a manual check by forcing a `requestFrame`
- [x] Death animation: tail rewinds / player explodes (TODO in `user-mode.js`)
  - Done as: block bursts into 3x3 pieces and the tail fades out over `ANIMATE_FRAMES`. A real tail "rewind" is still open if wanted; not checked in a browser yet
- [x] Server: support more than one game room instead of `games[0]` only
  - Rooms are never closed once opened (max 8, `MAX_GAMES` in `server.js`); empty extra rooms keep ticking. Could close empty rooms or show the room number in the client later
- [x] Add unit tests for tail filling (`fillTail` / `floodFill`) and Color
- [x] Add an ESLint config and fix warnings (implicit globals like `steps`, `distWeights` in bot-mode.js)
  - `npm run lint`: 0 errors, 9 warnings left (unused debug helpers in the bots, `gridWidth` in `user-mode.js` used by commented-out code); decide whether to delete them
- [ ] `npm audit` reports 2 critical issues in `sha.js` / `crypto-browserify` pulled in by browserify (build-time only); check whether upgrading or replacing browserify is worth it

## Log
- 2026-10-24: Revived project, fixed crashes and gameplay bugs, upgraded socket.io to v4, added `npm test` (6a3abca)
- 2026-10-24 18:01: End-of-game score screen: `#stats` now shows final/best land %, kills, best rank and time alive (`client-modes/stats.js`, unit-tested); not checked in a browser yet (preview server was declined during the automated run)
- 2026-10-24 18:03: Shared constants: `ANIMATE_FRAMES` and `NEW_PLAYER_LAG` added to `game-consts.js`; `game-core.js` and `player.js` no longer redefine `CELL_WIDTH`/`SPEED`; test for spawn lag and speed
- 2026-10-24 18:04: Login screen: placeholder title replaced with a coloured tile "BLOCKLY.IO" logo in HTML/CSS (smaller on narrow screens); not checked visually (no browser preview available in the automated run)
- 2026-10-24 18:05: Mobile, part 1: swipe controls for touch screens (unit-tested heading logic); UI bar layout on phones still open
- 2026-10-24 18:07: Frame verification back on: clients check player locations with the server once per second and request a resync on mismatch; server rejects malformed `verify` payloads instead of crashing on null entries
- 2026-10-24 18:08: Resync keeps kills, zoom, view and land bars, and no longer replays the drop-in animation for the whole map
- 2026-10-24 18:09: Death animation: dead players explode into pieces and their tail fades (`client-modes/explosion.js`, unit-tested); needs a visual check
- 2026-10-24 18:10: Game rooms: players join the requested room, else the first with space, else a new room (up to 8); all rooms tick (`Game.join`, unit-tested)
- 2026-10-24 18:11: Tests for closing a loop (tail + enclosed area filled, checked over the whole grid) and for Color (HSL to rgba, derive*, interpolate, range check)
- 2026-10-24 18:13: ESLint 9 config (`eslint.config.js`, `npm run lint`); fixed implicit globals in both bots (`steps` was never used: its init loop never ran on the sparse array) and removed unused variables
