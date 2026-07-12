// Thin wrapper over @board.fun/web-sdk. This is the ONLY file that
// imports the real SDK — every other module goes through here, so
// porting to a different platform means rewriting this file (plus the
// service wrappers listed in docs/spec/porting-checklist.md), not the
// game.
import { Board, BoardContactType, BoardContactPhase } from '@board.fun/web-sdk';

export { BoardContactType, BoardContactPhase };

export const isOnDevice = Board.isOnDevice;

// Board.input.unsubscribe takes the same callback reference passed to
// subscribe, not a token — return a closure so callers don't have to
// hold onto it themselves.
export function subscribe(onContacts) {
  Board.input.subscribe(onContacts);
  return () => Board.input.unsubscribe(onContacts);
}

// System pause overlay (the OS menu button in the screen corner) —
// see src/pause.js for how the game registers with it.
export const pause = Board.pause;

// App lifecycle: quit() returns to the Board launcher.
export const application = Board.application;

// On-device save-game service — see src/save.js (which also provides
// a localStorage fallback for desktop/dev, where this service doesn't
// exist).
export const save = Board.save;

// Session roster (who is playing — profiles/guests with persistent
// playerIds) — see src/roster.js, which wraps this with a desktop/dev
// fallback.
export const session = Board.session;
