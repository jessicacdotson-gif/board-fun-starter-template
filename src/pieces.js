// Symbolic piece-type registry for YOUR piece set.
//
// glyphIds start EMPTY on purpose: no published glyphId table exists
// for any piece set, so the mapping has to be discovered empirically
// on your own hardware. Deploy the glyph logger (debug/) and place
// each piece one at a time — full walkthrough in
// docs/spec/glyph-discovery.md. Rule: no numeric glyphId literal may
// appear anywhere outside this file.
//
// Note from that discovery on real hardware: duplicate physical pieces
// of the same archetype can share ONE glyphId — glyphId identifies the
// piece ARCHETYPE, not the individual piece. That's why game state is
// keyed by contactId, never by glyphId (see src/game.js).
export const PIECE_TYPES = {
  // EXAMPLE_PIECE: { count: 2, glyphIds: [] },
};

// glyphId 0 is the SDK's default/unrecognized value — confirmed on
// hardware to be reported both by bare Finger touches AND by a
// Glyph-type contact when the recognition model can't confidently
// classify what it's seeing (e.g. a piece that isn't sitting perfectly
// flat). It never identifies a real piece and must not be tracked as
// one (see docs/wiki/raw/board-hardware-findings.md).
export const UNRECOGNIZED_GLYPH_ID = 0;

export function pieceTypeForGlyphId(glyphId) {
  for (const [type, def] of Object.entries(PIECE_TYPES)) {
    if (def.glyphIds.includes(glyphId)) return type;
  }
  return null; // unknown glyph — expected until discovery has run
}
