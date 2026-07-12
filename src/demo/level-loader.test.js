import { describe, it, expect } from 'vitest';
import { validateLevel, levelGeometry, TRAY_WIDTH } from './level-loader.js';
import { BOARD_SPACE } from '../coords.js';
import demoLevel from '../levels/demo.json';

const valid = () => ({
  schemaVersion: 1,
  id: 'test',
  grid: { cols: 4, rows: 3, cellPx: 120 },
  winCount: 3,
  blocked: [{ col: 1, row: 1 }],
});

describe('validateLevel', () => {
  it('accepts a valid level, including the shipped demo level', () => {
    expect(validateLevel(valid())).toEqual([]);
    expect(validateLevel(demoLevel)).toEqual([]);
  });

  it('rejects wrong schemaVersion and bad ids', () => {
    expect(validateLevel({ ...valid(), schemaVersion: 2 })).not.toEqual([]);
    expect(validateLevel({ ...valid(), id: 'Bad Name!' })).not.toEqual([]);
  });

  it('rejects grids that do not fit board space between the trays', () => {
    const wide = valid();
    wide.grid.cols = 100;
    expect(validateLevel(wide).join()).toMatch(/too wide/);
    const tall = valid();
    tall.grid.rows = 100;
    expect(validateLevel(tall).join()).toMatch(/too tall/);
  });

  it('rejects out-of-bounds and duplicate blocked cells', () => {
    expect(validateLevel({ ...valid(), blocked: [{ col: 99, row: 0 }] }).join()).toMatch(/out of bounds/);
    expect(validateLevel({ ...valid(), blocked: [{ col: 0, row: 0 }, { col: 0, row: 0 }] }).join()).toMatch(/twice/);
  });

  it('rejects a winCount both players cannot reach', () => {
    // 4×3 grid, 1 blocked → 11 free cells; two players × 6 = 12 > 11.
    expect(validateLevel({ ...valid(), winCount: 6 }).join()).toMatch(/unreachable/);
    expect(validateLevel({ ...valid(), winCount: 5 })).toEqual([]);
  });
});

describe('levelGeometry', () => {
  it('centers the grid and maps points to cells', () => {
    const geometry = levelGeometry(valid());
    const { x, y } = geometry.cellRect(0, 0);
    expect(geometry.cellAt(x + 1, y + 1)).toEqual({ col: 0, row: 0 });
    expect(geometry.cellAt(x - 5, y)).toBe(null);
  });

  it('maps tray zones to player indices', () => {
    const geometry = levelGeometry(valid());
    expect(geometry.trayAt(TRAY_WIDTH - 1)).toBe(0);
    expect(geometry.trayAt(BOARD_SPACE.width - TRAY_WIDTH + 1)).toBe(1);
    expect(geometry.trayAt(BOARD_SPACE.width / 2)).toBe(null);
  });
});
