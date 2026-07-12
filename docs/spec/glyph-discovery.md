# Glyph ID discovery — how to run it

No piece set ships with a published glyphId table (confirmed the hard
way: developer docs' official guidance is "place one piece at a time
and log the id"). `debug/` is a small standalone tool for doing
exactly that — deploy it BEFORE writing piece logic; it will also
teach you the platform's contact semantics for free.

## Build & deploy

This is a separate build from the main game, so you can deploy it to
the Board temporarily without touching the game build:

```
npm run build:debug
npm run pack:debug
board-connect install <your-debug-appId>.webapp.zip --launch
```

(`board-connect pair` first if this machine isn't paired. Replace the
placeholder app-ids in package.json first — `/setup` does this; see
docs/wiki/raw/board-deploy-findings.md for why each app needs its own
pinned `--app-id`.)

The piece-recognition model for YOUR piece set must be at
`public/model.tflite` (downloaded from the Developer Portal) — Vite
copies it into every build, so no `--model` flag is needed.

## Using it

1. Launch the app on the Board.
2. Place one piece at a time. Each contact prints to the on-screen
   snapshot table AND the timestamped event log.
3. Record the glyphId → piece-archetype mapping into
   `src/pieces.js` (the only file allowed to hold glyphId literals),
   and note it in `docs/config.md`.
4. Place BOTH copies of any duplicated piece type, together: expect
   them to share one glyphId but hold two distinct contactIds — that's
   the platform telling you glyphId = archetype, contactId = piece.

## Watch out for

- The contact stream is a full per-frame snapshot — a still piece
  reappears every frame as `Stationary`. The snapshot table shows
  last-known state and never self-clears; when in doubt, trust the
  timestamped event log, and tap "Clear log" before taking diagnostic
  screenshots.
- A piece that isn't perfectly flat can spuriously report glyphId 0
  (unrecognized) before settling — expected, filtered by the game.
- While you're there, run the rest of
  `docs/spec/hardware-session-checklist.md` — device time is precious.
