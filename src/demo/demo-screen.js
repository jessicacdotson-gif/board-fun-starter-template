// Claim the Grid — rendering + input wiring. This is the only file in
// the demo that imports pixi.js (same isolation rule as
// board-adapter.js for the SDK): swap the draw calls here for real art
// later; the rules in claim-the-grid.js neither know nor care.
//
// Implements the screen interface src/input.js dispatches into. The
// player-identity mechanic: a claim DRAG must start inside your color
// tray — identity lives in screen geometry because the hardware
// cannot tell you whose finger a touch is (docs/spec/
// player-identity.md). Drags are keyed by contactId, so both players
// can claim simultaneously.
import { Application, Container, Graphics, Text } from 'pixi.js';
import { BOARD_SPACE } from '../coords.js';
import { levelGeometry, validateLevel, TRAY_WIDTH } from './level-loader.js';
import { createMatch } from './claim-the-grid.js';
import { createSaveStore } from '../save.js';
import { createRoster } from '../roster.js';
import levelDef from '../levels/demo.json';

const PLAYER_COLORS = [0x2dd4a7, 0xff9f43];
const NEW_GAME_BUTTON = { x: BOARD_SPACE.width / 2 - 110, y: 16, width: 220, height: 56 };

export async function startDemoScreen(root) {
  const levelErrors = validateLevel(levelDef);
  if (levelErrors.length > 0) {
    throw new Error(`src/levels/demo.json failed validation: ${levelErrors.join('; ')}`);
  }

  const app = new Application();
  await app.init({ resizeTo: root, backgroundColor: 0x0b0b14, antialias: true });
  root.appendChild(app.canvas);

  const geometry = levelGeometry(levelDef);
  const match = createMatch(levelDef);
  const saves = createSaveStore({
    description: 'Claim the Grid demo',
    localStorageKey: 'claim-the-grid-demo',
    version: 1,
  });
  const roster = createRoster();
  const playerName = (index) => roster.getPlayers()[index]?.name ?? `Player ${index + 1}`;

  match.restore(await saves.loadState());

  // Everything renders in board coordinates inside one container,
  // scaled to the viewport each frame (letterboxed top-left, matching
  // coords.js math).
  const stage = new Container();
  app.stage.addChild(stage);
  const g = new Graphics();
  stage.addChild(g);

  const makeText = (style, x, y, anchorX = 0.5) => {
    const t = new Text({ text: '', style: { fontFamily: 'monospace', fill: 0xf5f2ff, ...style } });
    t.anchor.set(anchorX, 0.5);
    t.position.set(x, y);
    stage.addChild(t);
    return t;
  };

  const title = makeText({ fontSize: 30 }, BOARD_SPACE.width / 2, 100);
  title.text = 'CLAIM THE GRID';
  const newGameLabel = makeText({ fontSize: 24 }, BOARD_SPACE.width / 2, NEW_GAME_BUTTON.y + NEW_GAME_BUTTON.height / 2);
  newGameLabel.text = 'New game';
  const hint = makeText({ fontSize: 20, fill: 0x8888aa }, BOARD_SPACE.width / 2, BOARD_SPACE.height - 40);
  hint.text = 'Drag from your color tray onto a cell to claim it — first to '
    + `${levelDef.winCount} wins. A physical piece parked on a cell locks it.`;
  const message = makeText({ fontSize: 22, fill: 0xffd166 }, BOARD_SPACE.width / 2, BOARD_SPACE.height - 90);
  const banner = makeText({ fontSize: 56 }, BOARD_SPACE.width / 2, BOARD_SPACE.height / 2);
  const trayLabels = [0, 1].map((i) => {
    const x = i === 0 ? TRAY_WIDTH / 2 : BOARD_SPACE.width - TRAY_WIDTH / 2;
    return {
      name: makeText({ fontSize: 22, fill: PLAYER_COLORS[i] }, x, 180),
      score: makeText({ fontSize: 44, fill: PLAYER_COLORS[i] }, x, 240),
    };
  });

  const drags = new Map(); // contact key -> { player, x, y }

  function flash(text) {
    message.text = text;
    message.alpha = 1;
  }

  function draw() {
    const scale = Math.min(app.screen.width / BOARD_SPACE.width, app.screen.height / BOARD_SPACE.height);
    stage.scale.set(scale);

    g.clear();

    // Player trays.
    for (const player of [0, 1]) {
      const x = player === 0 ? 0 : BOARD_SPACE.width - TRAY_WIDTH;
      g.rect(x, 0, TRAY_WIDTH, BOARD_SPACE.height).fill({ color: PLAYER_COLORS[player], alpha: 0.18 });
      g.rect(x, 0, TRAY_WIDTH, BOARD_SPACE.height).stroke({ color: PLAYER_COLORS[player], width: 3 });
      trayLabels[player].name.text = playerName(player);
      trayLabels[player].score.text = String(match.state.scores[player]);
    }

    // New game button.
    g.roundRect(NEW_GAME_BUTTON.x, NEW_GAME_BUTTON.y, NEW_GAME_BUTTON.width, NEW_GAME_BUTTON.height, 10)
      .stroke({ color: 0x8888aa, width: 2 });

    // Grid cells.
    for (let col = 0; col < geometry.cols; col++) {
      for (let row = 0; row < geometry.rows; row++) {
        const { x, y, size } = geometry.cellRect(col, row);
        const pad = 4;
        const owner = match.ownerOf(col, row);
        if (match.isBlocked(col, row)) {
          g.roundRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad, 8).fill(0x1a1a2e);
          g.moveTo(x + size * 0.3, y + size * 0.3).lineTo(x + size * 0.7, y + size * 0.7)
            .moveTo(x + size * 0.7, y + size * 0.3).lineTo(x + size * 0.3, y + size * 0.7)
            .stroke({ color: 0x44445c, width: 4 });
        } else if (owner !== null) {
          g.roundRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad, 8)
            .fill({ color: PLAYER_COLORS[owner], alpha: 0.85 });
        } else {
          g.roundRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad, 8)
            .fill(0x171726)
            .stroke({ color: 0x2c2c44, width: 1 });
        }
        if (match.isLocked(col, row)) {
          g.roundRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad, 8)
            .stroke({ color: 0xf5f2ff, width: 5 });
        }
      }
    }

    // Active claim drags.
    for (const drag of drags.values()) {
      g.circle(drag.x, drag.y, 28).fill({ color: PLAYER_COLORS[drag.player], alpha: 0.8 });
    }

    // Winner banner + fading feedback message.
    if (match.state.winner !== null) {
      g.rect(0, BOARD_SPACE.height / 2 - 70, BOARD_SPACE.width, 140).fill({ color: 0x0b0b14, alpha: 0.88 });
      banner.text = `${playerName(match.state.winner)} claims the grid! Tap New game.`;
      banner.style.fill = PLAYER_COLORS[match.state.winner];
      banner.visible = true;
    } else {
      banner.visible = false;
    }
    if (message.alpha > 0) message.alpha -= 0.008;
  }

  app.ticker.add(draw);

  async function saveNow() {
    await saves.saveState(match.snapshot());
  }

  function newGame() {
    match.reset();
    saveNow();
    flash('New game!');
  }

  const overNewGame = (p) =>
    p.x >= NEW_GAME_BUTTON.x && p.x <= NEW_GAME_BUTTON.x + NEW_GAME_BUTTON.width
    && p.y >= NEW_GAME_BUTTON.y && p.y <= NEW_GAME_BUTTON.y + NEW_GAME_BUTTON.height;

  return {
    app,
    saveNow,
    newGame,

    // --- screen interface driven by src/input.js ---
    dispatchTap(p, now, key) {
      if (overNewGame(p)) return newGame();
      const player = geometry.trayAt(p.x);
      if (player !== null) {
        drags.set(key, { player, x: p.x, y: p.y });
      } else if (geometry.cellAt(p.x, p.y)) {
        flash('Start your drag inside your color tray — that is how the board knows who you are.');
      }
    },

    dispatchMove(p, now, key) {
      const drag = drags.get(key);
      if (drag) {
        drag.x = p.x;
        drag.y = p.y;
      }
    },

    dispatchRelease(now, key) {
      const drag = drags.get(key);
      if (!drag) return;
      drags.delete(key);
      const cell = geometry.cellAt(drag.x, drag.y);
      if (!cell) return;
      const result = match.claim(drag.player, cell.col, cell.row);
      if (result.ok) {
        saveNow();
      } else {
        flash(result.reason);
      }
    },

    dispatchPiece(piece, now, key) {
      const cell = geometry.cellAt(piece.x, piece.y);
      if (cell) match.pieceDown(key, cell.col, cell.row);
      else match.pieceGone(key);
    },

    dispatchPieceGone(now, key) {
      match.pieceGone(key);
    },
  };
}
