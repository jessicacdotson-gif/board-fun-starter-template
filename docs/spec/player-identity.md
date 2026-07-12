# Player identity on a shared touchscreen

The single most important design constraint on this platform, verified
on hardware (see `docs/wiki/raw/board-hardware-findings.md`):

**The device cannot tell you whose finger a touch is.** `BoardContact`
carries no player field; `Board.session` knows who is playing but not
who touched what.

So player identity must be designed into the game, not read from the
input. The two patterns that work:

## 1. Identity lives in screen geometry (simultaneous play)

Give each player owned screen regions and make INTENT live in the
region, not the toucher:

- **Zone-origin**: an action belongs to a player because it started in
  their zone. The demo game does this — a claim drag must begin inside
  your color tray. Contact-keyed dragging (`src/input.js`) keeps two
  simultaneous drags independent.
- **Zone-target**: an action belongs to a player because of what it
  targets — e.g. interactive elements are colored per player, and
  tapping a blue element IS a blue-player action regardless of whose
  finger it was. This scales to free-form co-op movement (proven in
  the game this template was distilled from).

Both dodge the attribution problem completely: nothing needs to know
whose finger it was.

## 2. Identity lives in turn structure (sequential play)

If the game is turn-based (checkers, most classic board games), the
active player IS the identity — any touch is theirs. Cheapest option;
no zones needed. Consider a visible "whose turn" indicator anchored to
each player's table edge.

## What does NOT work

- Trusting `type: Finger` vs pieces to distinguish players.
- Assuming the OS profile roster maps touches to people.
- Voice/turn agreements the game can't enforce ("you take the left
  half") — fine socially, but the game can't referee them.

Physical pieces are also identity-free (a piece doesn't know who
placed it) — if a piece is per-player, that's a game rule you enforce
by geometry (which zone it sits in), not a platform fact.
