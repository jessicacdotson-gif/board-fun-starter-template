# Board hardware — behavior verified on a real device

Every claim here was established on physical Board hardware (OS 2.0.x)
while building a real game, mostly via the glyph-logger diagnostic app
in `debug/` — which is the recommended way to re-verify any of them on
your own device. Dates kept as verification provenance.

## Contact semantics

- **The device NEVER delivers an explicit Ended/Canceled frame**
  (verified 2026-07-04 with the glyph logger's timestamped event log,
  across repeated tests): a lifted piece or finger just vanishes from
  the next snapshot. Removal must be detected by snapshot
  reconciliation — `src/game.js` and `src/input.js` do exactly this.
  The event log's "vanished vs. explicit frame" distinction exists
  because a live snapshot table alone once led us to a false
  hypothesis mid-session; timestamped events settled it.
- **glyphId 0 is a shared "unrecognized" sentinel** (verified
  2026-07-04, extended 2026-07-06): reported by bare Finger touches
  AND by Glyph-type contacts the recognition model can't confidently
  classify (e.g. a piece not sitting perfectly flat). On some device
  builds a bare screen tap arrives as `type: Glyph, glyphId: 0` — not
  `type: Finger`. Treat glyphId-0 anything as finger-like input; never
  as a piece. (An early input adapter that filtered by `type` alone
  silently dropped every tap on the title screen.)
- **Duplicate physical pieces share one glyphId per archetype**
  (verified 2026-07-04 by placing each piece of a 7-piece set one at a
  time): glyphId identifies the piece TYPE, not the individual piece.
  Track pieces by `contactId`, never by glyphId.
- **Recognition isn't instant or certain on placement**: a settling
  piece can briefly report glyphId 0 before its real id. Don't design
  mechanics that require confident recognition in the first frames of
  a placement.
- **A hand resting on a piece registers as a separate finger contact**
  near the same spot (found in playtest 2026-07-06). If pieces and
  fingers can both act near the same target, give fresh piece input a
  priority window over finger input.
- **`orientation` zero-point can be rotated from the piece's visual
  "front"** (verified 2026-07-06, live, after two wrong guesses): on
  the piece type we calibrated, the directional nub sat at
  `reported − 90°` in screen convention (0°=right, clockwise, y
  down). Calibrate per piece type with the glyph logger before
  trusting orientation to aim anything.
- **Screen resolution is 1920×1080** (verified 2026-07-04 by reading a
  `board-connect screenshot` PNG's header bytes — no need to measure
  by hand). Contact x/y pass through as board coordinates unchanged.

## Player identity

- **There is no per-touch player attribution.** `BoardContact` has no
  player field, and `Board.session` is roster-only (who is playing,
  not who touched what). Verified against docs and by direct SDK
  import. Consequence: any multiplayer design needs identity to come
  from screen geometry (per-player zones — see docs/spec/
  player-identity.md and the demo's tray-drag mechanic) or from turn
  structure.

## Session/roster service (a debugging story worth knowing)

On a dev-installed webapp, `Board.session` initially looked broken:
`areServicesReady()` true but `getPlayers()` empty,
`getActiveProfile()` null, `presentAddPlayer()` resolving true without
persisting. We concluded "platform limitation, not fixable in game
code" — wrongly. A precise question to the developer community pointed
at the official showcase template, and comparing it revealed OUR bug:
we gated the roster path on `session.isReady()`, a narrower signal
that stays false even while `areServicesReady()` (the SDK-documented
gate, "whether the underlying save and overlay services are
connected") is true. After fixing the gate, real OS profiles worked.

Lessons encoded in `src/roster.js`:
- Gate session features on `areServicesReady()`, never `isReady()`.
- Call `getPlayers()` unconditionally and let the result decide;
  fall back to app-local stand-in players only when it's empty, and
  re-check live so real profiles take over the moment they appear.
- When you're sure it's a platform bug: write the evidence down, ask
  the platform team a precise question, and stay open to the answer
  being "your code."

## Debugging on device

- **There is no console-log access for installed webapps.** Debug with
  a temporary on-screen HUD plus `board-connect screenshot`. The
  glyph logger's on-screen event log exists for this reason.
- The OS pause overlay does nothing for your app until you register a
  pause context (`Board.pause.setContext`) — see `src/pause.js`.
- Before diagnostic screenshots, clear on-screen logs first — stale
  rows in a table that never self-clears look exactly like live state.
