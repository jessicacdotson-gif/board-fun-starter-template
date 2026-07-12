import { describe, it, expect } from 'vitest';
import { createMatch } from './claim-the-grid.js';

const LEVEL = {
  schemaVersion: 1,
  id: 'test',
  grid: { cols: 4, rows: 3, cellPx: 120 },
  winCount: 3,
  blocked: [{ col: 1, row: 1 }],
};

describe('claiming', () => {
  it('claims a free cell and scores it', () => {
    const match = createMatch(LEVEL);
    expect(match.claim(0, 0, 0)).toEqual({ ok: true });
    expect(match.ownerOf(0, 0)).toBe(0);
    expect(match.state.scores).toEqual([1, 0]);
  });

  it('refuses an already-claimed cell (either player)', () => {
    const match = createMatch(LEVEL);
    match.claim(0, 0, 0);
    expect(match.claim(1, 0, 0).ok).toBe(false);
    expect(match.claim(0, 0, 0).ok).toBe(false);
    expect(match.state.scores).toEqual([1, 0]);
  });

  it('refuses blocked cells', () => {
    const match = createMatch(LEVEL);
    const result = match.claim(0, 1, 1);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/blocked/);
  });

  it('first to winCount wins, then no further claims', () => {
    const match = createMatch(LEVEL);
    match.claim(0, 0, 0);
    match.claim(0, 1, 0);
    expect(match.state.winner).toBe(null);
    match.claim(0, 2, 0);
    expect(match.state.winner).toBe(0);
    expect(match.claim(1, 3, 0).ok).toBe(false);
  });
});

describe('piece locking', () => {
  it('a piece on a cell blocks claims until it vanishes', () => {
    const match = createMatch(LEVEL);
    match.pieceDown('7', 2, 2);
    expect(match.isLocked(2, 2)).toBe(true);
    expect(match.claim(0, 2, 2).ok).toBe(false);

    match.pieceGone('7'); // vanished from the snapshot — no removal event exists
    expect(match.isLocked(2, 2)).toBe(false);
    expect(match.claim(0, 2, 2).ok).toBe(true);
  });

  it('a piece sliding to a new cell releases the old one', () => {
    const match = createMatch(LEVEL);
    match.pieceDown('7', 0, 0);
    match.pieceDown('7', 0, 1);
    expect(match.isLocked(0, 0)).toBe(false);
    expect(match.isLocked(0, 1)).toBe(true);
  });

  it('two pieces lock independently (contact-keyed)', () => {
    const match = createMatch(LEVEL);
    match.pieceDown('7', 0, 0);
    match.pieceDown('8', 1, 0);
    match.pieceGone('7');
    expect(match.isLocked(0, 0)).toBe(false);
    expect(match.isLocked(1, 0)).toBe(true);
  });
});

describe('reset and persistence', () => {
  it('reset clears claims and winner but keeps piece locks (pieces are physical)', () => {
    const match = createMatch(LEVEL);
    match.claim(0, 0, 0);
    match.pieceDown('7', 2, 2);
    match.reset();
    expect(match.ownerOf(0, 0)).toBe(null);
    expect(match.state.scores).toEqual([0, 0]);
    expect(match.state.winner).toBe(null);
    expect(match.isLocked(2, 2)).toBe(true);
  });

  it('snapshot/restore round-trips claims, scores, and winner — not piece locks', () => {
    const match = createMatch(LEVEL);
    match.claim(0, 0, 0);
    match.claim(1, 1, 0);
    match.pieceDown('7', 2, 2);
    const saved = JSON.parse(JSON.stringify(match.snapshot()));

    const restored = createMatch(LEVEL);
    restored.restore(saved);
    expect(restored.ownerOf(0, 0)).toBe(0);
    expect(restored.ownerOf(1, 0)).toBe(1);
    expect(restored.state.scores).toEqual([1, 1]);
    expect(restored.isLocked(2, 2)).toBe(false);
  });

  it('restore(null) is a no-op (fresh boot with no save)', () => {
    const match = createMatch(LEVEL);
    match.restore(null);
    expect(match.state.scores).toEqual([0, 0]);
  });
});
