// Claim the Grid — the demo game's rules. Deliberately trivial: the
// point of this module is to exercise every piece of platform plumbing
// (zone-based player identity, contact-keyed input, piece tracking
// with vanish-reconciliation, save, pause) with rules simple enough to
// read in one sitting. Delete src/demo/ wholesale when you start your
// real game (`/setup` offers to).
//
// Pure logic: no renderer, no SDK, no clock — fully unit-testable.
const key = (col, row) => `${col},${row}`;

export function createMatch(level) {
  const blocked = new Set((level.blocked ?? []).map((c) => key(c.col, c.row)));

  const state = {
    owners: new Map(), // "col,row" -> player index (0 | 1)
    scores: [0, 0],
    winner: null,
    pieceLocks: new Map(), // contact key -> "col,row"
  };

  const lockedCells = () => new Set(state.pieceLocks.values());

  return {
    state,
    level,

    isBlocked(col, row) {
      return blocked.has(key(col, row));
    },

    isLocked(col, row) {
      return lockedCells().has(key(col, row));
    },

    ownerOf(col, row) {
      return state.owners.get(key(col, row)) ?? null;
    },

    // A player claims a cell. Refusals carry a reason so the UI can
    // show WHY instead of silently ignoring the drop.
    claim(player, col, row) {
      if (state.winner !== null) return { ok: false, reason: 'game over — start a new game' };
      const k = key(col, row);
      if (blocked.has(k)) return { ok: false, reason: 'that cell is blocked' };
      if (lockedCells().has(k)) return { ok: false, reason: 'a piece is holding that cell' };
      if (state.owners.has(k)) return { ok: false, reason: 'already claimed' };
      state.owners.set(k, player);
      state.scores[player]++;
      if (state.scores[player] >= level.winCount) state.winner = player;
      return { ok: true };
    },

    // A recognized physical piece is sitting on a cell: the cell is
    // locked (unclaimable) while the piece stays down. Keyed by the
    // piece's contact key so two pieces work independently and a piece
    // sliding to a new cell releases the old one.
    pieceDown(contactKey, col, row) {
      state.pieceLocks.set(contactKey, key(col, row));
    },

    // The piece vanished from the contact snapshot (the hardware never
    // sends an explicit removal event) — release its lock.
    pieceGone(contactKey) {
      state.pieceLocks.delete(contactKey);
    },

    reset() {
      state.owners.clear();
      state.scores = [0, 0];
      state.winner = null;
      // pieceLocks survive reset — physical pieces are still on the table.
    },

    // Save/restore: plain-JSON shape for src/save.js. Piece locks are
    // NOT persisted — they mirror physical objects, which the next
    // session re-detects from live contacts.
    snapshot() {
      return {
        owners: [...state.owners.entries()],
        scores: [...state.scores],
        winner: state.winner,
      };
    },

    restore(saved) {
      if (!saved) return;
      state.owners = new Map(saved.owners ?? []);
      state.scores = Array.isArray(saved.scores) ? [...saved.scores] : [0, 0];
      state.winner = saved.winner ?? null;
    },
  };
}
