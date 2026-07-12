// Contact-plumbing tests. The real SDK imports cleanly in Node with
// isOnDevice=false, so these use the SDK's actual enum values rather
// than mocks.
import { describe, it, expect } from 'vitest';
import { BoardContactType, BoardContactPhase } from '@board.fun/web-sdk';
import { createGame } from './game.js';

function glyph(contactId, glyphId, phase, overrides = {}) {
  return {
    contactId,
    type: BoardContactType.Glyph,
    glyphId,
    x: 100,
    y: 100,
    orientation: 0,
    phase,
    isTouched: false,
    ...overrides,
  };
}

function finger(contactId, phase, overrides = {}) {
  return {
    contactId,
    type: BoardContactType.Finger,
    glyphId: 0,
    x: 50,
    y: 50,
    orientation: 0,
    phase,
    ...overrides,
  };
}

describe('piece tracking', () => {
  it('tracks a placed piece by contactId', () => {
    const game = createGame();
    game.onFrame([glyph(1, 42, BoardContactPhase.Began)], 0);
    expect(game.state.pieces.size).toBe(1);
    expect(game.state.pieces.get(1).glyphId).toBe(42);
    expect(game.state.pieces.get(1).placedAt).toBe(0);
  });

  it('two pieces sharing one glyphId coexist (duplicate physical pieces)', () => {
    const game = createGame();
    game.onFrame(
      [glyph(1, 42, BoardContactPhase.Began), glyph(2, 42, BoardContactPhase.Began)],
      0,
    );
    expect(game.state.pieces.size).toBe(2);
    // lifting one must not delete the other
    game.onFrame(
      [glyph(1, 42, BoardContactPhase.Ended), glyph(2, 42, BoardContactPhase.Stationary)],
      33,
    );
    expect(game.state.pieces.size).toBe(1);
    expect(game.state.pieces.has(2)).toBe(true);
  });

  it('a piece already down at subscribe time (Stationary, no Began) is tracked', () => {
    const game = createGame();
    game.onFrame([glyph(1, 42, BoardContactPhase.Stationary)], 0);
    expect(game.state.pieces.size).toBe(1);
  });

  it('removes on Ended and on Canceled', () => {
    const game = createGame();
    game.onFrame([glyph(1, 42, BoardContactPhase.Began)], 0);
    game.onFrame([glyph(1, 42, BoardContactPhase.Ended)], 33);
    expect(game.state.pieces.size).toBe(0);

    game.onFrame([glyph(2, 42, BoardContactPhase.Began)], 66);
    game.onFrame([glyph(2, 42, BoardContactPhase.Canceled)], 99);
    expect(game.state.pieces.size).toBe(0);
  });

  it('reconciles away a piece that silently vanishes without an Ended frame', () => {
    const game = createGame();
    game.onFrame([glyph(1, 42, BoardContactPhase.Began)], 0);
    game.onFrame([], 33); // hardware never delivered Ended — snapshot just omits it
    expect(game.state.pieces.size).toBe(0);
  });

  it('never tracks glyphId 0 as a piece (unrecognized/low-confidence, confirmed on hardware)', () => {
    const game = createGame();
    game.onFrame([glyph(1, 0, BoardContactPhase.Began)], 0);
    expect(game.state.pieces.size).toBe(0);
  });

  it('drops a tracked piece if it starts reporting glyphId 0 (defensive)', () => {
    const game = createGame();
    game.onFrame([glyph(1, 42, BoardContactPhase.Began)], 0);
    expect(game.state.pieces.size).toBe(1);
    game.onFrame([glyph(1, 0, BoardContactPhase.Stationary)], 33);
    expect(game.state.pieces.size).toBe(0);
  });

  it('updates position/orientation/isTouched but preserves placedAt', () => {
    const game = createGame();
    game.onFrame([glyph(1, 42, BoardContactPhase.Began)], 1000);
    game.onFrame(
      [glyph(1, 42, BoardContactPhase.Moved, { x: 200, y: 300, orientation: 90, isTouched: true })],
      2000,
    );
    const piece = game.state.pieces.get(1);
    expect(piece.x).toBe(200);
    expect(piece.orientation).toBe(90);
    expect(piece.isTouched).toBe(true);
    expect(piece.placedAt).toBe(1000);
  });
});

describe('finger tracking', () => {
  it('tracks and reconciles fingers separately from pieces', () => {
    const game = createGame();
    game.onFrame([finger(10, BoardContactPhase.Began), glyph(1, 42, BoardContactPhase.Began)], 0);
    expect(game.state.fingers.size).toBe(1);
    expect(game.state.pieces.size).toBe(1);

    game.onFrame([glyph(1, 42, BoardContactPhase.Stationary)], 33); // finger vanished
    expect(game.state.fingers.size).toBe(0);
    expect(game.state.pieces.size).toBe(1);
  });

  it('preserves beganAt across finger moves', () => {
    const game = createGame();
    game.onFrame([finger(10, BoardContactPhase.Began)], 500);
    game.onFrame([finger(10, BoardContactPhase.Moved, { x: 80 })], 600);
    expect(game.state.fingers.get(10).beganAt).toBe(500);
    expect(game.state.fingers.get(10).x).toBe(80);
  });
});
