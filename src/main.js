// Bootstrap — boots the demo on both device and desktop. This is the
// time-injection boundary: game logic never reads the clock itself,
// so the timestamp is supplied here. Wrapped in an async IIFE (not
// top-level await) because Vite's default browser build target
// rejects top-level await.
//
// The important pattern: on BOTH device and desktop, ALL input flows
// through the same contact pipeline (input.js). The desktop just feeds
// it fabricated frames — the mouse becomes a synthetic finger contact
// on a fake board, and `window.fakeBoard` places synthetic pieces from
// the console. Nothing downstream knows the difference, which is what
// makes the game testable in a browser preview at all (the Web SDK has
// no simulator — docs/decisions/0001-web-sdk-no-simulator.md).
import { isOnDevice, subscribe } from './board-adapter.js';
import { screenToBoard } from './coords.js';
import { createBoardInputAdapter } from './input.js';

(async () => {
  const { startDemoScreen } = await import('./demo/demo-screen.js');
  const screen = await startDemoScreen(document.getElementById('game-root'));
  const onContacts = createBoardInputAdapter(screen);

  if (isOnDevice) {
    subscribe((contacts) => onContacts(contacts, performance.now()));

    // Register with the OS pause overlay (the system menu button) —
    // Save & Quit plus a New game custom button.
    const { startSystemPause } = await import('./pause.js');
    startSystemPause({
      gameName: 'Claim the Grid',
      saveNow: screen.saveNow,
      customButtons: [{ id: 'new-game', title: 'New game', icon: 'restart' }],
      onCustomButton: (id) => {
        if (id === 'new-game') screen.newGame();
      },
    });
    return;
  }

  // Desktop/dev: fake board frames through the same adapter at ~30fps.
  const { createFakeBoard } = await import('./dev/fake-board.js');
  const fake = createFakeBoard();
  setInterval(() => onContacts(fake.frame(), performance.now()), 33);

  // The mouse is a synthetic finger contact.
  const canvas = screen.app.canvas;
  const toBoard = (event) => {
    const rect = canvas.getBoundingClientRect();
    return screenToBoard(event.clientX - rect.left, event.clientY - rect.top, {
      width: rect.width,
      height: rect.height,
    });
  };
  let mouseContact = null;
  canvas.addEventListener('pointerdown', (event) => {
    const { x, y } = toBoard(event);
    mouseContact = fake.pressFinger(x, y);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (mouseContact === null) return;
    const { x, y } = toBoard(event);
    fake.move(mouseContact, x, y);
  });
  const release = () => {
    if (mouseContact !== null) fake.lift(mouseContact);
    mouseContact = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  window.fakeBoard = fake;
  console.log(
    '[fake-board] desktop dev mode. The mouse is a finger; place synthetic '
    + 'pieces from the console (any nonzero glyphId works until you fill '
    + 'src/pieces.js):\n'
    + '  const id = fakeBoard.placePiece(901, 700, 500)\n'
    + '  fakeBoard.move(id, 950, 500)\n'
    + '  fakeBoard.lift(id)',
  );
})();
