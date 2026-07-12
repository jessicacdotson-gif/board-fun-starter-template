// The single home for the board-space -> screen-space transform.
// Contact x/y are device pixels, origin top-left, Y down (per SDK
// docs). Every hit-test and renderer must go through here — do not
// grow local copies of this math.
//
// 1920×1080 is the real device resolution, confirmed on hardware by
// reading a `board-connect screenshot` PNG's header bytes (see
// docs/wiki/raw/board-hardware-findings.md).
export const BOARD_SPACE = { width: 1920, height: 1080 };

export function boardToScreen(x, y, viewport) {
  const scale = Math.min(
    viewport.width / BOARD_SPACE.width,
    viewport.height / BOARD_SPACE.height,
  );
  return { x: x * scale, y: y * scale, scale };
}

// Inverse of boardToScreen — for hit-testing pointer/mouse input
// against board-space positions.
export function screenToBoard(x, y, viewport) {
  const scale = Math.min(
    viewport.width / BOARD_SPACE.width,
    viewport.height / BOARD_SPACE.height,
  );
  return { x: x / scale, y: y / scale };
}
