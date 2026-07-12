# Requirements & design — living document

_The `/setup` skill seeds the header; keep this current as the source
of truth for WHAT you're building. Raw ideas go in `docs/inbox/`
first; decisions get ADRs; this file holds current understanding._

## The game

_(what it is, for whom, why it's fun — one paragraph)_

## Core loop

_(what players actually do, moment to moment)_

## Design constraints (platform-imposed — do not design against these)

- No per-touch player attribution → identity via zones or turns
  (docs/spec/player-identity.md).
- No explicit contact-removal events → mechanics must tolerate
  snapshot reconciliation latency (~1 frame).
- Piece recognition has a settling window → no frame-perfect
  placement mechanics.
- Shared single screen at 1920×1080 → discrete screen transitions,
  not scrolling cameras, if physical pieces stay on the table.

## Open questions

_Write questions down instead of silently assuming. Format: the
question, why it matters, the provisional answer in use, what would
resolve it._

| # | Question | Provisional answer | Resolves via |
|---|----------|--------------------|--------------|
| 1 | _(example) Does role selection repeat per level?_ | _(yes, for now)_ | _(playtest)_ |

## Out of scope (deliberately)

_(things you decided NOT to build, so the reason survives)_
