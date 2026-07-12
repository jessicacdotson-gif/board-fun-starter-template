# Project config — canonical facts

Single source of truth for facts the whole project relies on. The
`/setup` skill fills this in; keep it current as decisions land.
Anything here should be treated as settled — changing it deserves an
ADR.

## The game

- **Name:** _(set by /setup)_
- **Slug:** _(set by /setup)_
- **Concept:** _(one line — set by /setup)_
- **Players:** _(count, competitive/co-op/solo)_

## Platform

- **Target:** _(Board.fun device / web-hosted / other — set by /setup)_
- **Screen space:** 1920×1080 device pixels (`src/coords.js`
  BOARD_SPACE — confirmed on real Board hardware)
- **Physical pieces:** _(yes/no; if yes, list the piece set and fill
  `src/pieces.js` via docs/spec/glyph-discovery.md)_

## Deploy identity (Board.fun target only)

- **Game app-id:** _(generate a fresh GUID; set in package.json
  `pack`/`deploy` scripts)_
- **Glyph-logger app-id:** _(a DIFFERENT fresh GUID; `pack:debug`)_
- **package-ids:** _(strict reverse-domain, no hyphens, e.g.
  fun.board.mygame)_
- **Model file:** `public/model.tflite` — downloaded from the
  Developer Portal for YOUR piece set; gitignored, never committed.

## Platform facts verified on hardware

See `docs/wiki/raw/board-hardware-findings.md` for the full list with
verification notes. Highlights every design must respect:

- No explicit contact-removal events — snapshot reconciliation only.
- glyphId 0 = unrecognized (never a piece; can be a bare tap).
- No per-touch player attribution — player identity must come from
  screen geometry or turn structure (`docs/spec/player-identity.md`).
- Piece `orientation` zero-point may be rotated from the piece's
  visual "front" — calibrate per piece type before trusting it.
