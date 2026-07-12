# Working conventions

This repo is a starter template for building tabletop/board-console
games with Claude Code (built for Board.fun hardware; `/setup`
retargets it). These conventions are the process the template exists
to demonstrate — follow them.

## The docs system is load-bearing

`docs/` is the project's working memory across sessions (see
`docs/README.md` for the full flow):

- **Capture as you go**: when something comes up mid-session — an
  idea, a gotcha, a decision, a "wait, we need to handle X" — append
  it to `docs/inbox/log.md` with a date. Zero formatting effort.
- **File open questions, don't silently assume.** If a design or
  platform question can't be answered right now, write it down as an
  open question in the relevant `docs/spec/` file and pick a
  provisional answer marked as such.
- **Decisions get ADRs** (`/new-decision`): one file per notable
  decision with the reasoning, so it never gets relitigated from
  scratch. Superseded ADRs are marked, never rewritten.
- **Findings beat memory.** Anything verified against the real
  platform (hardware behavior, SDK quirks, deploy gotchas) goes in
  `docs/wiki/raw/` with the date and how it was verified.

## Code rules

- `src/board-adapter.js` is the ONLY file that imports the platform
  SDK. Renderer imports (pixi.js) are similarly confined to `*-screen`
  files. Everything else is plain logic — keep it that way; it's what
  makes the game testable and portable.
- No numeric glyphId literal anywhere outside `src/pieces.js`.
- Game logic never reads the clock — time is injected from the boot
  layer (`src/main.js`) so logic stays deterministic and testable.
- Every hit-test and render transform goes through `src/coords.js` —
  no local copies of the board-space math.
- Guardrail style: operations that refuse should return
  `{ ok: false, reason }` — the UI shows WHY, never silently ignores.
- Tests are content-independent: they use frozen fixtures, not live
  level files (editing content in the builder must never break tests).
- Run `npm test` before calling any change done.

## Platform gotchas (the expensive lessons — details in docs/wiki/raw/)

- Contacts are per-frame snapshots; the device NEVER sends an explicit
  removal event. Reconcile by diffing snapshots.
- glyphId 0 = "unrecognized", shared by bare finger touches and
  badly-seated pieces. Never track it as a piece; always route it as
  finger-like input.
- Pin explicit, distinct `--app-id`s per packaged app — `web-pack`
  silently reuses an auto-persisted appId across apps packed from the
  same directory.
- There is no console-log access for installed webapps — debug on
  device with a temporary on-screen HUD + `board-connect screenshot`.
- Windows note: if a spawned dev server can't find `npm`/`node`, use
  the full path to `node.exe` in `.claude/launch.json` — npm isn't
  always on a spawned process's PATH.
