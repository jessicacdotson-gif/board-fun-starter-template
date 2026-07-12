// Dev-only contact-frame simulator for desktop browsers. The Web SDK
// has no simulator (see docs/decisions/0001-web-sdk-no-simulator.md),
// so this fabricates the SDK's per-frame snapshot semantics instead:
// every frame is the complete set of active contacts, still contacts
// re-appear as Stationary, a fresh contact appears once as Began, and
// a lifted contact appears once as Ended before vanishing.
//
// NOTE: faithful to the *documented* semantics. Real hardware differs
// in one important way this harness deliberately does NOT reproduce:
// the device never actually delivers Ended/Canceled frames — contacts
// just vanish from the snapshot (docs/wiki/raw/
// board-hardware-findings.md). Game code must handle both, which is
// exactly what game.js/input.js's reconciliation does.
import { BoardContactType, BoardContactPhase } from '../board-adapter.js';

let nextContactId = 1;

export function createFakeBoard() {
  // contactId -> { contact fields..., fresh: bool, dirty: bool, lifted: bool }
  const active = new Map();

  function add(type, glyphId, x, y, orientation) {
    const contactId = nextContactId++;
    active.set(contactId, {
      contactId, type, glyphId, x, y, orientation,
      isTouched: type === BoardContactType.Glyph ? true : undefined,
      fresh: true, dirty: false, lifted: false,
    });
    return contactId;
  }

  return {
    placePiece(glyphId, x, y, orientation = 0) {
      return add(BoardContactType.Glyph, glyphId, x, y, orientation);
    },
    pressFinger(x, y) {
      return add(BoardContactType.Finger, 0, x, y, 0);
    },
    move(contactId, x, y, orientation) {
      const c = active.get(contactId);
      if (!c) return;
      c.x = x;
      c.y = y;
      if (orientation !== undefined) c.orientation = orientation;
      c.dirty = true;
    },
    touch(contactId, isTouched) {
      const c = active.get(contactId);
      if (c && c.type === BoardContactType.Glyph) {
        c.isTouched = isTouched;
        c.dirty = true;
      }
    },
    lift(contactId) {
      const c = active.get(contactId);
      if (c) c.lifted = true;
    },
    // Build this frame's snapshot and advance contact lifecycles.
    frame() {
      const snapshot = [];
      for (const [contactId, c] of active) {
        let phase;
        if (c.lifted) {
          phase = BoardContactPhase.Ended;
          active.delete(contactId);
        } else if (c.fresh) {
          phase = BoardContactPhase.Began;
          c.fresh = false;
        } else if (c.dirty) {
          phase = BoardContactPhase.Moved;
          c.dirty = false;
        } else {
          phase = BoardContactPhase.Stationary;
        }
        snapshot.push({
          contactId: c.contactId,
          type: c.type,
          glyphId: c.glyphId,
          x: c.x,
          y: c.y,
          orientation: c.orientation,
          phase,
          isTouched: c.isTouched,
        });
      }
      return snapshot;
    },
  };
}
