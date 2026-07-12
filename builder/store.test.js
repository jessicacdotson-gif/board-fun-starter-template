import { describe, it, expect } from 'vitest';
import { createStore, newLevelTemplate } from './store.js';

// Frozen fixture — deliberately NOT the live src/levels/*.json content,
// so editing real levels never breaks the test suite.
const fixture = () => ({
  schemaVersion: 1,
  id: 'fixture',
  grid: { cols: 4, rows: 3, cellPx: 120 },
  winCount: 3,
  blocked: [{ col: 1, row: 1 }],
});

describe('store basics', () => {
  it('a fresh template validates clean', () => {
    const store = createStore(newLevelTemplate('new-level'));
    expect(store.validate()).toEqual([]);
  });

  it('undo restores the previous document and tracks dirty', () => {
    const store = createStore(fixture());
    expect(store.dirty).toBe(false);
    store.toggleBlocked(0, 0);
    expect(store.isBlocked(0, 0)).toBe(true);
    expect(store.dirty).toBe(true);
    store.undo();
    expect(store.isBlocked(0, 0)).toBe(false);
  });

  it('loadDocument swaps documents with fresh undo history', () => {
    const store = createStore(fixture());
    store.toggleBlocked(0, 0);
    store.loadDocument(newLevelTemplate('other'));
    expect(store.def.id).toBe('other');
    expect(store.dirty).toBe(false);
    expect(store.undo().ok).toBe(false);
  });
});

describe('guardrails refuse with a reason', () => {
  it('refuses blocking a cell that makes winCount unreachable', () => {
    const store = createStore(fixture());
    // 4×3 = 12 cells, 1 blocked, winCount 3 → needs 6 free; free would
    // drop below with 6 blocked. Block until refused.
    store.setWinCount(5); // needs 10 free of 11
    const result = store.toggleBlocked(0, 0); // free would drop to 10 — ok
    expect(result.ok).toBe(true);
    const refused = store.toggleBlocked(0, 1); // free would drop to 9 < 10
    expect(refused.ok).toBe(false);
    expect(refused.reason).toMatch(/unreachable/);
  });

  it('refuses out-of-grid toggles', () => {
    const store = createStore(fixture());
    expect(store.toggleBlocked(99, 0).ok).toBe(false);
  });

  it('refuses a winCount the free cells cannot support', () => {
    const store = createStore(fixture());
    expect(store.setWinCount(6).ok).toBe(false); // 11 free < 12 needed
    expect(store.setWinCount(5).ok).toBe(true);
  });

  it('refuses shrinking the grid over existing blocked cells', () => {
    const store = createStore({
      ...fixture(),
      grid: { cols: 6, rows: 4, cellPx: 120 },
      blocked: [{ col: 5, row: 0 }],
    });
    const result = store.setGrid(4, 4); // blocked cell sits at col 5
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/unblock/);
    expect(store.setGrid(4, 3).ok).toBe(false); // still refused, same reason path
  });

  it('refuses grid sizes the schema rejects (too small / too big)', () => {
    const store = createStore(fixture());
    expect(store.setGrid(2, 3).ok).toBe(false);
    expect(store.setGrid(100, 3).ok).toBe(false);
    expect(store.setGrid(5, 3).ok).toBe(true);
  });

  it('refuses invalid ids via the shared validator', () => {
    const store = createStore(fixture());
    expect(store.setId('Bad Name!').ok).toBe(false);
    expect(store.setId('good-name').ok).toBe(true);
  });
});
