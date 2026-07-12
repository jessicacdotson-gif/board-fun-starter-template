// Level builder — WYSIWYG editing of the same level JSON the game
// loads, rendered with the same geometry module the game uses
// (levelGeometry), so what you block out here is exactly what players
// get. Saving POSTs through the validating middleware in
// vite.config.builder.js and lands in src/levels/.
import { levelGeometry, TRAY_WIDTH } from '../src/demo/level-loader.js';
import { BOARD_SPACE } from '../src/coords.js';
import { createStore, newLevelTemplate } from './store.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const SCALE = canvas.width / BOARD_SPACE.width; // 960/1920 = 0.5

const els = {
  picker: document.getElementById('picker'),
  newButton: document.getElementById('new'),
  id: document.getElementById('id'),
  cols: document.getElementById('cols'),
  rows: document.getElementById('rows'),
  win: document.getElementById('win'),
  undo: document.getElementById('undo'),
  save: document.getElementById('save'),
  message: document.getElementById('message'),
  errors: document.getElementById('errors'),
  dirty: document.getElementById('dirty'),
};

const store = createStore(newLevelTemplate('untitled'));
let currentFile = null;

function say(text) {
  els.message.textContent = text ?? '';
}

// Apply a store op and surface its refusal reason, if any.
function apply(result) {
  if (!result.ok) say(result.reason);
  else if (!result.unchanged) say('');
  refresh();
  return result;
}

function refresh() {
  const def = store.def;
  els.id.value = def.id;
  els.cols.value = def.grid.cols;
  els.rows.value = def.grid.rows;
  els.win.value = def.winCount;
  els.dirty.textContent = store.dirty ? '● unsaved' : '';
  els.errors.textContent = store.validate().join('\n');
  draw();
}

function draw() {
  const def = store.def;
  const geometry = levelGeometry(def);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(SCALE, SCALE);

  // Player trays — shown so the author sees the real playable frame.
  for (const [x, color] of [[0, '#2dd4a7'], [BOARD_SPACE.width - TRAY_WIDTH, '#ff9f43']]) {
    ctx.fillStyle = color + '22';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillRect(x, 0, TRAY_WIDTH, BOARD_SPACE.height);
    ctx.strokeRect(x, 0, TRAY_WIDTH, BOARD_SPACE.height);
  }

  for (let col = 0; col < geometry.cols; col++) {
    for (let row = 0; row < geometry.rows; row++) {
      const { x, y, size } = geometry.cellRect(col, row);
      const pad = 4;
      if (store.isBlocked(col, row)) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad);
        ctx.strokeStyle = '#44445c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + size * 0.3, y + size * 0.3);
        ctx.lineTo(x + size * 0.7, y + size * 0.7);
        ctx.moveTo(x + size * 0.7, y + size * 0.3);
        ctx.lineTo(x + size * 0.3, y + size * 0.7);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#171726';
        ctx.fillRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad);
        ctx.strokeStyle = '#2c2c44';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad);
      }
    }
  }
  ctx.restore();
}

// --- canvas painting: click toggles, drag paints the same state ---
let paint = null; // 'block' | 'unblock' while dragging
let lastCell = null;

function cellFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width) / SCALE;
  const y = (event.clientY - rect.top) * (canvas.height / rect.height) / SCALE;
  return levelGeometry(store.def).cellAt(x, y);
}

canvas.addEventListener('pointerdown', (event) => {
  const cell = cellFromEvent(event);
  if (!cell) return;
  paint = store.isBlocked(cell.col, cell.row) ? 'unblock' : 'block';
  lastCell = `${cell.col},${cell.row}`;
  apply(store.toggleBlocked(cell.col, cell.row));
});
canvas.addEventListener('pointermove', (event) => {
  if (!paint) return;
  const cell = cellFromEvent(event);
  if (!cell) return;
  const key = `${cell.col},${cell.row}`;
  if (key === lastCell) return;
  lastCell = key;
  const blocked = store.isBlocked(cell.col, cell.row);
  if ((paint === 'block') !== blocked) apply(store.toggleBlocked(cell.col, cell.row));
});
const stopPaint = () => { paint = null; lastCell = null; };
canvas.addEventListener('pointerup', stopPaint);
canvas.addEventListener('pointerleave', stopPaint);

// --- sidebar controls ---
els.id.addEventListener('change', () => apply(store.setId(els.id.value)));
els.cols.addEventListener('change', () => apply(store.setGrid(els.cols.value, els.rows.value)));
els.rows.addEventListener('change', () => apply(store.setGrid(els.cols.value, els.rows.value)));
els.win.addEventListener('change', () => apply(store.setWinCount(els.win.value)));
els.undo.addEventListener('click', () => apply(store.undo()));

els.newButton.addEventListener('click', () => {
  const id = prompt('New level id (lowercase-kebab):', 'my-level');
  if (!id) return;
  store.loadDocument(newLevelTemplate(id), { markDirty: true });
  currentFile = null;
  say(`new level "${id}" — Save to game writes src/levels/${id}.json`);
  refresh();
});

els.picker.addEventListener('change', async () => {
  const file = els.picker.value;
  if (!file) return;
  const def = await (await fetch(`/api/levels/${file}`)).json();
  store.loadDocument(def);
  currentFile = file;
  say(`loaded ${file}`);
  refresh();
});

els.save.addEventListener('click', async () => {
  const file = currentFile ?? `${store.def.id}.json`;
  const response = await fetch('/api/save-level', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ file, def: store.def }),
  });
  const result = await response.json();
  if (result.ok) {
    store.markSaved();
    currentFile = file;
    say(`saved src/levels/${file} — the game picks it up on next load`);
    await loadPicker();
  } else {
    say(`save refused: ${result.error}`);
  }
  refresh();
});

async function loadPicker() {
  const { files = [] } = await (await fetch('/api/levels/')).json();
  els.picker.innerHTML = '<option value="">— pick a level —</option>'
    + files.map((f) => `<option${f === currentFile ? ' selected' : ''}>${f}</option>`).join('');
}

// Boot: list levels and open the first one (or keep the fresh template).
(async () => {
  await loadPicker();
  const first = els.picker.options[1]?.value;
  if (first) {
    const def = await (await fetch(`/api/levels/${first}`)).json();
    store.loadDocument(def);
    currentFile = first;
    els.picker.value = first;
  }
  refresh();
})();
