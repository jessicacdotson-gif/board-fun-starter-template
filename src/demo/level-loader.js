// Level schema v1 for the Claim the Grid demo: validation + geometry.
// The level builder (builder/) saves through the SAME validateLevel()
// via the dev-server middleware in vite.config.builder.js — an invalid
// level can be edited in the builder but never saved into the game.
// This file is plain logic with no DOM/renderer dependency, so both
// sides (and the tests) can import it.
import { BOARD_SPACE } from '../coords.js';

// Side zones where each player starts their claim drag — the
// player-identity mechanism (see docs/spec/player-identity.md for why
// identity must live in screen geometry, not in the touch itself).
export const TRAY_WIDTH = 200;

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function validateLevel(def) {
  const errors = [];
  if (!def || typeof def !== 'object') return ['level must be an object'];
  if (def.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!ID_PATTERN.test(def.id ?? '')) errors.push('id must be lowercase-kebab (a-z, 0-9, -)');

  const grid = def.grid ?? {};
  const { cols, rows, cellPx } = grid;
  if (!Number.isInteger(cols) || cols < 4) errors.push('grid.cols must be an integer >= 4');
  if (!Number.isInteger(rows) || rows < 3) errors.push('grid.rows must be an integer >= 3');
  if (!Number.isInteger(cellPx) || cellPx < 40) errors.push('grid.cellPx must be an integer >= 40');
  if (errors.length > 0) return errors; // geometry checks need sane numbers

  if (cols * cellPx > BOARD_SPACE.width - 2 * TRAY_WIDTH) {
    errors.push(`grid too wide: ${cols}×${cellPx}px must fit between the player trays (${BOARD_SPACE.width - 2 * TRAY_WIDTH}px)`);
  }
  if (rows * cellPx > BOARD_SPACE.height) {
    errors.push(`grid too tall: ${rows}×${cellPx}px exceeds the ${BOARD_SPACE.height}px board`);
  }

  const blocked = def.blocked ?? [];
  if (!Array.isArray(blocked)) {
    errors.push('blocked must be an array');
  } else {
    const seen = new Set();
    for (const cell of blocked) {
      const key = `${cell?.col},${cell?.row}`;
      if (!Number.isInteger(cell?.col) || !Number.isInteger(cell?.row)
        || cell.col < 0 || cell.col >= cols || cell.row < 0 || cell.row >= rows) {
        errors.push(`blocked cell out of bounds: ${key}`);
      } else if (seen.has(key)) {
        errors.push(`blocked cell listed twice: ${key}`);
      }
      seen.add(key);
    }
  }

  const freeCells = cols * rows - (Array.isArray(blocked) ? blocked.length : 0);
  if (!Number.isInteger(def.winCount) || def.winCount < 1) {
    errors.push('winCount must be an integer >= 1');
  } else if (def.winCount * 2 > freeCells) {
    errors.push(`winCount ${def.winCount} unreachable: both players need winCount cells but only ${freeCells} are free`);
  }

  return errors;
}

// Grid pixel geometry, centered in board space between the trays.
export function levelGeometry(level) {
  const { cols, rows, cellPx } = level.grid;
  const originX = Math.round((BOARD_SPACE.width - cols * cellPx) / 2);
  const originY = Math.round((BOARD_SPACE.height - rows * cellPx) / 2);

  return {
    cols,
    rows,
    cellPx,
    originX,
    originY,
    // Board-space point -> cell, or null when outside the grid.
    cellAt(x, y) {
      const col = Math.floor((x - originX) / cellPx);
      const row = Math.floor((y - originY) / cellPx);
      if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
      return { col, row };
    },
    cellRect(col, row) {
      return { x: originX + col * cellPx, y: originY + row * cellPx, size: cellPx };
    },
    // Which player's tray a board-space point is in: 0 (left),
    // 1 (right), or null.
    trayAt(x) {
      if (x < TRAY_WIDTH) return 0;
      if (x > BOARD_SPACE.width - TRAY_WIDTH) return 1;
      return null;
    },
  };
}
