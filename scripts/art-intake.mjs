// Cut fake/flat backgrounds out of AI-image-generator sprite exports.
// Two modes, auto-detected per file from its border pixels:
//
//  - Chroma-key (magenta): the reliable convention — prompt your image
//    generator for a solid magenta (#FF00FF) background instead of
//    "transparent." Hue-based match with tolerance (generators won't
//    hit the exact hex), plus an edge spill-suppression pass to clean
//    up the residual pink-tinted fringe pixels a plain flood-fill
//    leaves behind. By default this ALSO clears enclosed magenta
//    regions that don't touch the border (background trapped inside a
//    ring or loop shape). Pass --preserve-magenta for art that
//    legitimately contains magenta-adjacent hues: that flag skips the
//    enclosed pass and only clears border-connected background.
//  - Checkerboard (legacy): some generators' "transparent" export
//    actually bakes a light-gray checkerboard into the pixels (this is
//    why the magenta convention exists — caught twice in production
//    use). Border-flood, eating only near-neutral light-gray pixels.
//
// Both modes flood from the image borders inward so interior pixels
// (even ones that happen to be magenta-ish or light-gray) are
// protected by the sprite's own outline. Run:
//   node scripts/art-intake.mjs public/assets/<file>.png ...
import fs from 'node:fs';
import { PNG } from 'pngjs';

const HUE_TOLERANCE_DEG = 28; // key-removal pass
const SPILL_HUE_TOLERANCE_DEG = 45; // looser — catches faded fringe too
const STRICT_HUE_TOLERANCE_DEG = 20; // enclosed-region seeds (high confidence)
const MAGENTA_HUE_DEG = 300;

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

const hueDist = (h) => Math.min(Math.abs(h - MAGENTA_HUE_DEG), 360 - Math.abs(h - MAGENTA_HUE_DEG));

const isCheckerGray = (r, g, b, a) => {
  if (a === 0) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min <= 12 && min >= 180;
};

const isMagentaKey = (r, g, b, a) => {
  if (a === 0) return true;
  const { h, s, l } = rgbToHsl(r, g, b);
  return hueDist(h) <= HUE_TOLERANCE_DEG && s >= 0.35 && l >= 0.25 && l <= 0.9;
};

const isMagentaFringe = (r, g, b, a) => {
  if (a === 0) return false; // already handled by the key pass
  const { h, s } = rgbToHsl(r, g, b);
  return hueDist(h) <= SPILL_HUE_TOLERANCE_DEG && s >= 0.15;
};

// High-confidence key pixel — used to seed the enclosed-region pass.
// Deliberately stricter than the flood matcher: an enclosed pocket's
// core is unmistakably the key color; its anti-aliased halo is then
// eaten by growing the flood outward with the looser matcher.
const isStrictMagenta = (r, g, b) => {
  const { h, s } = rgbToHsl(r, g, b);
  return hueDist(h) <= STRICT_HUE_TOLERANCE_DEG && s >= 0.5;
};

function flood(width, height, matches, seed) {
  const visited = new Uint8Array(width * height);
  const queue = [];
  const tryEnqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i] || !matches(i)) return;
    visited[i] = 1;
    queue.push(i);
  };
  seed(tryEnqueue);
  while (queue.length) {
    const i = queue.pop();
    const x = i % width;
    const y = (i - x) / width;
    tryEnqueue(x + 1, y); tryEnqueue(x - 1, y);
    tryEnqueue(x, y + 1); tryEnqueue(x, y - 1);
  }
  return visited;
}

function floodFromBorders(width, height, matches) {
  return flood(width, height, matches, (tryEnqueue) => {
    for (let x = 0; x < width; x++) { tryEnqueue(x, 0); tryEnqueue(x, height - 1); }
    for (let y = 0; y < height; y++) { tryEnqueue(0, y); tryEnqueue(width - 1, y); }
  });
}

function detectMode(data, width, height) {
  const corners = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + width - 1) * 4];
  let magentaVotes = 0;
  for (const p of corners) {
    if (isMagentaKey(data[p], data[p + 1], data[p + 2], 255)) magentaVotes++;
  }
  return magentaVotes >= 2 ? 'magenta' : 'checkerboard';
}

const args = process.argv.slice(2);
const preserveMagenta = args.includes('--preserve-magenta');
const files = args.filter((a) => a !== '--preserve-magenta');

for (const file of files) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { width, height, data } = png;
  const mode = detectMode(data, width, height);
  const matcher = mode === 'magenta' ? isMagentaKey : isCheckerGray;

  const matches = (i) => {
    const p = i * 4;
    return matcher(data[p], data[p + 1], data[p + 2], data[p + 3]);
  };

  let keyed;
  if (mode === 'magenta' && !preserveMagenta) {
    // Seed from the borders AND from every high-confidence key pixel
    // anywhere in the image — clears background trapped inside closed
    // shapes (rings, loops) that a border-only flood can't reach. The
    // flood still grows with the looser matcher, so each pocket's
    // anti-aliased halo is eaten along with its core.
    keyed = flood(width, height, matches, (tryEnqueue) => {
      for (let x = 0; x < width; x++) { tryEnqueue(x, 0); tryEnqueue(x, height - 1); }
      for (let y = 0; y < height; y++) { tryEnqueue(0, y); tryEnqueue(width - 1, y); }
      for (let i = 0; i < width * height; i++) {
        const p = i * 4;
        if (data[p + 3] !== 0 && isStrictMagenta(data[p], data[p + 1], data[p + 2])) {
          const x = i % width;
          tryEnqueue(x, (i - x) / width);
        }
      }
    });
  } else {
    keyed = floodFromBorders(width, height, matches);
  }

  let cleared = 0;
  for (let i = 0; i < keyed.length; i++) {
    if (keyed[i]) { data[i * 4 + 3] = 0; cleared++; }
  }

  let despilled = 0;
  if (mode === 'magenta') {
    // Edge spill suppression: any opaque pixel touching a just-cleared
    // pixel that still reads as magenta-tinted gets its color pulled
    // toward neutral, proportional to how strong the tint is — fixes
    // the residual pink-fringe pixels a hard cutoff alone leaves behind.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (keyed[i]) continue;
        const neighbors = [i - 1, i + 1, i - width, i + width].filter((n) => n >= 0 && n < keyed.length);
        if (!neighbors.some((n) => keyed[n])) continue;
        const p = i * 4;
        const r = data[p], g = data[p + 1], b = data[p + 2];
        if (!isMagentaFringe(r, g, b, data[p + 3])) continue;
        const { s } = rgbToHsl(r, g, b);
        const strength = Math.min(1, s); // stronger tint = stronger correction
        const neutral = (r + g + b) / 3;
        data[p] = Math.round(r + (neutral - r) * strength * 0.7);
        data[p + 1] = Math.round(g + (neutral - g) * strength * 0.7);
        data[p + 2] = Math.round(b + (neutral - b) * strength * 0.7);
        despilled++;
      }
    }
  }

  fs.writeFileSync(file, PNG.sync.write(png));
  const cornerAlpha = data[3];
  const spillNote = mode === 'magenta' ? `, despilled ${despilled} px` : '';
  console.log(`${file}: mode=${mode}, cleared ${cleared} px (${((cleared / (width * height)) * 100).toFixed(1)}%)${spillNote}, corner alpha now ${cornerAlpha}`);
}
