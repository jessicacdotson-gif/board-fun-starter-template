// Contact tracking, hardened against the platform's real behavior
// (every claim here was verified on physical hardware — see
// docs/wiki/raw/board-hardware-findings.md):
//
// - Pieces are keyed by contactId, NOT glyphId: duplicate physical
//   pieces of one archetype share a glyphId.
// - Frame reconciliation is the removal path: the device never
//   delivers an explicit Ended/Canceled frame — a lifted piece just
//   vanishes from the next snapshot.
// - glyphId 0 is a shared "unrecognized" sentinel, never a piece.
// - Time is injected by the caller (never read the clock here), so
//   all of this is deterministic and unit-testable.
import { BoardContactType, BoardContactPhase } from './board-adapter.js';
import { pieceTypeForGlyphId, UNRECOGNIZED_GLYPH_ID } from './pieces.js';

export function createGame() {
  const state = {
    pieces: new Map(), // contactId -> piece record
    fingers: new Map(), // contactId -> finger record
  };

  function onFrame(contacts, now) {
    const seen = new Set();
    for (const contact of contacts) {
      seen.add(contact.contactId);
      if (contact.type === BoardContactType.Glyph) {
        handlePieceContact(state, contact, now);
      } else if (contact.type === BoardContactType.Finger) {
        handleFingerContact(state, contact, now);
      }
      // Blob contacts (palms/forearms) are ignored until a use emerges.
    }
    // Contacts are a per-frame snapshot of everything active, so any
    // tracked contact absent from this frame is gone — this holds
    // whether or not the hardware ever delivers an Ended frame.
    for (const [contactId] of state.pieces) {
      if (!seen.has(contactId)) state.pieces.delete(contactId);
    }
    for (const contactId of state.fingers.keys()) {
      if (!seen.has(contactId)) state.fingers.delete(contactId);
    }
  }

  return { state, onFrame };
}

function isEndPhase(phase) {
  return phase === BoardContactPhase.Ended || phase === BoardContactPhase.Canceled;
}

function handlePieceContact(state, contact, now) {
  const { contactId, glyphId, phase } = contact;

  // Unrecognized/low-confidence contact — never track it as a piece
  // (an imperfectly-flat piece can spuriously report this).
  if (glyphId === UNRECOGNIZED_GLYPH_ID) {
    if (state.pieces.has(contactId)) state.pieces.delete(contactId);
    return;
  }

  if (isEndPhase(phase)) {
    state.pieces.delete(contactId);
    return;
  }

  const existing = state.pieces.get(contactId);
  state.pieces.set(contactId, {
    contactId,
    glyphId,
    type: pieceTypeForGlyphId(glyphId),
    x: contact.x,
    y: contact.y,
    orientation: contact.orientation,
    isTouched: contact.isTouched,
    lastPhase: phase,
    placedAt: existing ? existing.placedAt : now,
  });
}

function handleFingerContact(state, contact, now) {
  const { contactId, phase } = contact;

  if (isEndPhase(phase)) {
    state.fingers.delete(contactId);
    return;
  }

  const existing = state.fingers.get(contactId);
  state.fingers.set(contactId, {
    contactId,
    x: contact.x,
    y: contact.y,
    lastPhase: phase,
    beganAt: existing ? existing.beganAt : now,
  });
}
