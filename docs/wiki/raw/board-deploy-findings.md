# Board deploy pipeline — findings

The path from `dist/` to running on a device, with the gotchas that
cost real evenings. All verified 2026-07-04 through 2026-07-08 on a
real device.

## The pipeline

```
npm run build      # vite build → dist/
npm run pack       # web-pack dist → <appId>.webapp.zip
board-connect install <appId>.webapp.zip --launch --timeout 10m
```

- `board-connect` is a **standalone binary**, not an npm package:
  `curl -fsSL https://dev.board.fun/connect/install | sh` (macOS/
  Linux) or `irm https://dev.board.fun/connect/install.ps1 | iex`
  (Windows). One-time pairing: `board-connect pair`.
- `web-pack` IS an npm package (`@board.fun/web-pack`, dev
  dependency here) — it does not ship with board-connect.
- Useful subcommands you might miss: `capabilities` (OS version +
  feature tags), `screenshot --out shot.png` (your only eyes on an
  installed app — there's no console-log access for webapps), `apps`,
  `status`.

## Gotchas (each verified by hitting it)

- **appId reuse is silent.** When `--app-id` is omitted, `web-pack`
  persists the minted appId to `board.config.json` in the cwd and
  reuses it for ANY later pack from that directory — regardless of
  `--package-id`, with no warning. Packing a debug tool then the main
  game from the same repo silently gave both the same appId. Fix
  (this template's `package.json`): always pass explicit, distinct
  `--app-id`s per app. Generate your own GUIDs via `/setup` — the
  committed placeholders are intentionally invalid-looking.
- **`--package-id` is strict reverse-domain, no hyphens**
  (`fun.board.mygamedebug` works; `fun.board.mygame-debug` is
  rejected).
- **The piece-recognition model must ship inside the package.**
  `web-pack` expects `model.tflite` in the dist dir (or `--model`,
  whose path is relative to the dist dir, not absolute — verified by
  testing; the docs imply otherwise). Putting the model at
  `public/model.tflite` makes Vite copy it into every build
  automatically. The model is licensed per piece set — download yours
  from the Developer Portal; it's gitignored here on purpose.
- **Use `--timeout 10m` on install for real bundles.** A ~70MB
  package on slow Wi-Fi blew the default install deadline four times
  in a row one evening while small requests (screenshot,
  capabilities) worked fine — it looked like a broken device and was
  just a short timeout.
- **"APK" in Board's docs is an analogy**, not literal Android
  packaging — deploy format is `.webapp.zip` via board-connect; Board
  runs its own OS family.
- The debug glyph logger builds/packs/deploys as its OWN app
  (`npm run build:debug` / `pack:debug`) so you can put diagnostics on
  the device without touching your game build.
