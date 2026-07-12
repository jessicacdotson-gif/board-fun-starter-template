// Board contact → screen input adapter. Converts the SDK's per-frame
// contact snapshots into tap/move/release/piece events, keyed by
// contactId so multi-touch works (two players pressing simultaneously
// stay independent).
//
// Uses the same reconciliation approach as game.js: the device never
// delivers an explicit Ended/Canceled frame (confirmed on hardware —
// docs/wiki/raw/board-hardware-findings.md) — a lifted finger/removed
// piece just vanishes from the next snapshot, so releases are detected
// by diffing snapshots, not by phase.
//
// A contact is finger-like — routed to tap/move/release — if it's
// EITHER a real Finger-type contact OR reports glyphId 0 regardless of
// its `type` field. Hardware lesson behind that rule: glyphId 0 is a
// shared "unrecognized" sentinel that can show up on Glyph-type
// contacts too (an imperfectly-flat piece, or — on some devices — a
// bare screen tap reporting `type: Glyph, glyphId: 0` instead of
// `type: Finger`). The first build of this adapter only checked
// `type === Finger` and separately dropped glyphId-0 Glyph contacts as
// noise, so real taps were silently discarded by both filters — the
// title screen never received a single tap. Only a genuinely
// recognized piece (Glyph type AND glyphId !== 0) drives
// dispatchPiece.
//
// The screen interface this adapter drives:
//   dispatchTap(point, now, key)      — finger-like contact began
//   dispatchMove(point, now, key)     — it moved
//   dispatchRelease(now, key)         — it vanished
//   dispatchPiece(piece, now, key)    — recognized piece present this frame
//   dispatchPieceGone(now, key)       — tracked piece vanished (optional)
import { BoardContactType } from './board-adapter.js';
import { pieceTypeForGlyphId, UNRECOGNIZED_GLYPH_ID } from './pieces.js';

function isFingerLike(contact) {
  return contact.type === BoardContactType.Finger || contact.glyphId === UNRECOGNIZED_GLYPH_ID;
}

export function createBoardInputAdapter(screen) {
  const knownFingers = new Map(); // contactId -> { x, y }
  const knownPieces = new Set(); // contactId, for release detection

  return function onContacts(contacts, now) {
    const seenFingers = new Set();
    const seenPieces = new Set();

    for (const contact of contacts) {
      // Contact x/y are device pixels; the device viewport is exactly
      // BOARD_SPACE (1920×1080), so they pass through as board
      // coordinates unchanged.
      if (isFingerLike(contact)) {
        const key = String(contact.contactId);
        seenFingers.add(key);
        const p = { x: contact.x, y: contact.y };
        const prev = knownFingers.get(key);
        if (!prev) {
          knownFingers.set(key, p);
          screen.dispatchTap(p, now, key);
        } else if (prev.x !== p.x || prev.y !== p.y) {
          knownFingers.set(key, p);
          screen.dispatchMove?.(p, now, key);
        }
      } else if (contact.type === BoardContactType.Glyph) {
        const key = String(contact.contactId);
        seenPieces.add(key);
        knownPieces.add(key);
        screen.dispatchPiece?.({
          type: pieceTypeForGlyphId(contact.glyphId),
          glyphId: contact.glyphId,
          x: contact.x,
          y: contact.y,
          orientation: contact.orientation,
          isTouched: contact.isTouched,
        }, now, key);
      }
    }

    // Reconciliation: anything we knew that isn't in this snapshot has
    // lifted/been removed (no Ended frame ever arrives — vanishing IS
    // the signal).
    for (const key of knownFingers.keys()) {
      if (!seenFingers.has(key)) {
        knownFingers.delete(key);
        screen.dispatchRelease?.(now, key);
      }
    }
    for (const key of knownPieces) {
      if (!seenPieces.has(key)) {
        knownPieces.delete(key);
        screen.dispatchPieceGone?.(now, key);
      }
    }
  };
}
