// Level-builder document store. Owns the level definition being edited
// — the same schema-v1 JSON the game loads — plus undo and every
// mutation the UI can perform. All ops are plain-object logic with no
// canvas/DOM dependency, so this whole layer is unit-testable.
//
// Guardrail philosophy: rules the schema can't express as data are
// enforced here as REFUSALS WITH A REASON (blocking a cell that makes
// the win unreachable, shrinking the grid over existing blocked
// cells); everything else flows through validateLevel() and surfaces
// in the sidebar's error panel. Ops return { ok, reason? } so the UI
// can show WHY an edit was refused instead of silently ignoring it.
import { validateLevel } from '../src/demo/level-loader.js';

// A fresh level that passes every guardrail out of the box.
export function newLevelTemplate(id) {
  return {
    schemaVersion: 1,
    id,
    grid: { cols: 12, rows: 7, cellPx: 120 },
    winCount: 8,
    blocked: [],
  };
}

export function createStore(initialDef) {
  let def = structuredClone(initialDef);
  const undoStack = [];
  let dirty = false;

  function snapshot() {
    undoStack.push(structuredClone(def));
    if (undoStack.length > 100) undoStack.shift();
    dirty = true;
  }

  const freeCells = (blockedCount = def.blocked.length) =>
    def.grid.cols * def.grid.rows - blockedCount;

  return {
    get def() { return def; },
    get dirty() { return dirty; },
    markSaved() { dirty = false; },
    validate() { return validateLevel(def); },
    serialize() { return JSON.stringify(def, null, 2) + '\n'; },

    // Switch to a different level document entirely: fresh undo
    // history, clean dirty state (markDirty for a brand-new unsaved
    // level).
    loadDocument(newDef, { markDirty = false } = {}) {
      def = structuredClone(newDef);
      undoStack.length = 0;
      dirty = markDirty;
      return { ok: true };
    },

    undo() {
      if (undoStack.length === 0) return { ok: false, reason: 'nothing to undo' };
      def = undoStack.pop();
      dirty = true;
      return { ok: true };
    },

    isBlocked(col, row) {
      return def.blocked.some((c) => c.col === col && c.row === row);
    },

    toggleBlocked(col, row) {
      if (col < 0 || col >= def.grid.cols || row < 0 || row >= def.grid.rows) {
        return { ok: false, reason: 'outside the grid' };
      }
      const index = def.blocked.findIndex((c) => c.col === col && c.row === row);
      if (index < 0 && def.winCount * 2 > freeCells(def.blocked.length + 1)) {
        return { ok: false, reason: `blocking this cell makes winCount ${def.winCount} unreachable — lower it first` };
      }
      snapshot();
      if (index >= 0) def.blocked.splice(index, 1);
      else def.blocked.push({ col, row });
      return { ok: true };
    },

    setWinCount(n) {
      const value = Number(n);
      if (!Number.isInteger(value) || value < 1) return { ok: false, reason: 'winCount must be an integer >= 1' };
      if (value * 2 > freeCells()) {
        return { ok: false, reason: `winCount ${value} unreachable: both players need that many of the ${freeCells()} free cells` };
      }
      if (value === def.winCount) return { ok: true, unchanged: true };
      snapshot();
      def.winCount = value;
      return { ok: true };
    },

    setGrid(cols, rows) {
      cols = Number(cols);
      rows = Number(rows);
      const orphans = def.blocked.filter((c) => c.col >= cols || c.row >= rows);
      if (orphans.length > 0) {
        return { ok: false, reason: `${orphans.length} blocked cell(s) would fall outside the new grid — unblock them first` };
      }
      const candidate = { ...def, grid: { ...def.grid, cols, rows } };
      const errors = validateLevel(candidate);
      if (errors.length > 0) return { ok: false, reason: errors.join('; ') };
      if (cols === def.grid.cols && rows === def.grid.rows) return { ok: true, unchanged: true };
      snapshot();
      def.grid.cols = cols;
      def.grid.rows = rows;
      return { ok: true };
    },

    setId(id) {
      const value = (id ?? '').trim();
      const errors = validateLevel({ ...def, id: value });
      if (errors.length > 0) return { ok: false, reason: errors.join('; ') };
      if (value === def.id) return { ok: true, unchanged: true };
      snapshot();
      def.id = value;
      return { ok: true };
    },
  };
}
