# Board Web SDK — API & setup findings

Source: docs.dev.board.fun (quick-start, setup-reference,
build-and-deploy, architecture, api reference, sample, changelog),
first fetched 2026-07-04; claims marked "verified" were tested
directly rather than taken from the docs.

## Install

- Package: `@board.fun/web-sdk`. **[!CONFLICT — verified 2026-07-04]**
  The changelog page claims v1.0.0 is stable, but the public npm
  registry only had prereleases (`1.0.0-beta.3`–`beta.6`) — no `1.0.0`
  tag existed. This template pins `1.0.0-beta.6`. Re-check
  `npm view @board.fun/web-sdk versions` and bump to the real 1.0.0
  once it's actually published. Lesson: read the registry, not just
  the changelog.
- ESM-only ("no UMD or CommonJS build"); Node 18+ and an ESM bundler
  (Vite/esbuild/Rollup) required.
- The SDK imports cleanly in Node with `isOnDevice=false` (verified) —
  which is why the tests use the SDK's real enum values, not mocks.
- Official scaffold exists: `npm create @board.fun/game`
  (`--template showcase` is the reference implementation worth
  scaffolding once and reading — see the session-service story in
  board-hardware-findings.md).

## API surface

- `Board` is a single frozen object: `Board.input`, `Board.session`,
  `Board.save`, `Board.avatar`, `Board.pause`, `Board.application`,
  plus `Board.isOnDevice` and `Board.sdkVersion`.
- `Board.input.subscribe(callback)` starts a per-frame snapshot
  callback of ALL active contacts. `unsubscribe` takes the **same
  callback reference**, not a token.
- `BoardContact`: `contactId`, `type`, `glyphId`, `x`, `y` (device
  pixels, origin top-left, Y down), `orientation` (degrees, Glyph
  only), `phase`, `isTouched` (true while physically touching the
  piece).
- `BoardContactType`: `Finger`, `Glyph`, `Blob`.
  `BoardContactPhase`: `None`, `Began`, `Moved`, `Ended`, `Canceled`,
  `Stationary`.
- Docs explicitly note: contacts are a full per-frame **snapshot**,
  not a diff/event stream — a still piece reappears every frame as
  `Stationary`. (Reality goes further: see the removal-semantics
  finding in board-hardware-findings.md.)
- Recommended pattern: gate device-only logic on `Board.isOnDevice`;
  prefer capability checks over version checks.

## Vite

- `vite.config.js` must set `base: "./"` — the build is served from a
  device folder, not a web root, so every asset path must be relative.
- No simulator exists for the Web SDK (only the Unity SDK has one) —
  see docs/decisions/0001-web-sdk-no-simulator.md for how this
  template copes (fake-board harness + real-hardware verification).
