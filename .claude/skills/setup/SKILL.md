---
name: setup
description: Configure this template for a new game — interviews you about the game and target platform (Board.fun device, web-hosted, or another platform), then prunes modules, renames everything, seeds the docs, and verifies the result. Run once on a fresh copy of the template.
---

# Template setup

You are configuring a fresh copy of this game template. Interview the
user, then EDIT THE REPO to match their answers. Work top to bottom.
Do not skip the verification step at the end.

Interview style: questions about THEIR GAME (section 1) are
open-ended — ask them as free-text questions and do not invent
example games, names, or concepts for them to pick from; it's their
game, and made-up options anchor or annoy. Multiple-choice is right
only where the answer set is genuinely closed (platform, keep/remove
a module).

## 1. Interview — the game

Ask for (free text, their words — these answers seed the README,
docs/config.md, and docs/spec/requirements.md in step 4, so capture
the user's own phrasing, not a summary of it):
- **Game name** (display name) and a lowercase-kebab **slug**.
- **One-line concept** (what is it?).
- **Players**: how many, competitive/co-op/solo, simultaneous or
  turn-based.
- **Core loop**: what do players actually do, moment to moment?
- **Feel**: what should a great session feel like? (tense race, cozy
  puzzle, party chaos — whatever they say)
- **Physical pieces**: what role do they play in the design, if any?

## 2. Interview — the platform (the load-bearing question)

Ask which platform the game targets, and explain the consequences:

**A. Board.fun device** (the default this template is built for)
- Keep everything.
- Explain the app-id gotcha: `web-pack` silently reuses one
  auto-persisted appId across different packages built from the same
  directory, so `package.json` pins explicit `--app-id`s. Generate two
  fresh GUIDs (game + glyph logger), replace the placeholder
  `00000000-…-000000000001/2` ids in the `pack`, `pack:debug`, and
  `deploy` scripts, and update `--package-id`/`--name` (package-id is
  strict reverse-domain, NO hyphens).
- Remind them: the piece-recognition model for their piece set must be
  downloaded from the Board Developer Portal to `public/model.tflite`
  (gitignored — never commit it).
- Point at `docs/spec/hardware-session-checklist.md` and, if the game
  uses physical pieces, `docs/spec/glyph-discovery.md`.

**B. Web-hosted (browser only, no Board hardware)**
- Delete: `debug/`, `vite.config.debug.js`, `src/pieces.js`,
  `src/roster.js`, `src/pause.js`, the `pack`/`pack:debug`/`deploy`/
  `dev:debug`/`build:debug` npm scripts, the `@board.fun/*`
  dependencies, and the glyph-logger launch config.
- Rewrite `src/board-adapter.js` to a stub exporting
  `isOnDevice = false` (the desktop pointer path in `src/main.js`
  becomes the only input path; delete the `isOnDevice` branch).
- `src/save.js` keeps its localStorage path; strip the Board branch.
- Remove Board-specific sections from `docs/` (keep the docs SYSTEM).
- Delete the tests that exercise removed modules.

**C. Another platform (retrofit)**
- Keep the architecture; nothing is deleted automatically.
- Generate `docs/spec/porting-checklist.md` enumerating the
  platform-coupled modules that need rewriting for the new platform:
  `src/board-adapter.js` (SDK wrapper — the only file importing it),
  `src/input.js` (contact semantics), `src/save.js`, `src/pause.js`,
  `src/roster.js` (OS services), `src/coords.js` (BOARD_SPACE
  resolution), the `pack`/`deploy` scripts, and
  `src/dev/fake-board.js` (simulator semantics).
- Warn that the hardware findings in `docs/wiki/raw/` are
  Board-specific facts — keep them for reference, but re-verify every
  assumption on the new platform.

## 3. Interview — the modules

- **Physical pieces?** (Board only) If no: delete `src/pieces.js`,
  `debug/`, `vite.config.debug.js`, `docs/spec/glyph-discovery.md`,
  the debug npm scripts and launch config; strip the piece paths from
  `src/game.js`/`src/input.js` and their tests.
- **Level builder?** If no: delete `builder/`,
  `vite.config.builder.js`, the `dev:builder` script, and its launch
  config. If yes: ask what a "level" means for their game and note in
  the backlog that `src/demo/level-loader.js`'s schema is the file to
  evolve.
- **Keep the demo game?** Recommend deleting `src/demo/` +
  `src/levels/` once they start their real game (it exists to prove
  the plumbing); offer to keep it as reference for now.

## 4. Act

1. Apply every deletion/edit chosen above.
2. Rename `package.json`'s name and `index.html`'s `<title>` to the
   game name/slug from step 1. The pause-context `gameName` in
   `src/main.js` belongs to whatever game actually boots: rename it
   ONLY if the demo is being deleted/replaced by their game now. If
   the demo is kept as reference, leave the demo's own name in place
   (a pause menu saying "<their game>" over a running Claim the Grid
   is a lie) and add a backlog item to rename it when their real game
   takes over the boot path.
3. REGENERATE `README.md` for their game — do not merely retitle the
   template's README (its body describes the template and its
   authors' project, which is wrong the moment this repo is someone's
   game). Write a fresh README from the interview: game name +
   concept, players + feel in the user's own words, quick start
   (`npm install`, `npm run dev`, `npm test`), current status /
   what's real vs. planned, and a one-line credit linking back to the
   starter template this repo was configured from.
4. Fill `docs/config.md`'s placeholders (game name, concept, players,
   platform, deploy ids, decisions from this interview), and seed
   `docs/spec/requirements.md`'s "The game" and "Core loop" sections
   from the interview answers — including at least one open question
   the interview surfaced but didn't settle.
5. Seed `docs/spec/backlog.md` with the user's stated next steps from
   the interview, plus any items this setup generated (e.g. "run glyph
   discovery", "evolve level schema", "rename pause context when the
   real game replaces the demo").
6. Append a dated entry to `docs/inbox/log.md` summarizing what setup
   configured and why.

## 5. Verify — non-negotiable

1. Run `npm install` (if not yet run) and `npm test` — the pruned repo
   must be green. If tests fail, fix the pruning (you removed a module
   something still imports) before finishing.
2. Run `npm run build` — must succeed.
3. Commit everything as `Configure template for <game name>`.
4. Tell the user what was kept, what was removed, and what their next
   three actions should be (from the backlog you seeded).
