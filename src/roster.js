// Session-roster access (who is playing), with a desktop/dev fallback
// (Board.session only exists on hardware).
//
// Device: wraps Board.session — players are real OS profiles/guests
// with persistent playerIds; "add player" opens the OS player selector
// overlay.
//
// Desktop/dev: a fake two-profile roster so any select-players flow is
// exercisable in a browser preview; "add player" appends a fake guest.
//
// HARD-WON GATING LESSON (full story in docs/wiki/raw/
// board-hardware-findings.md): gate session features on
// session.areServicesReady() — the SDK-documented signal that the
// save/overlay services are connected — NOT on session.isReady().
// isReady() is a different, narrower signal that can stay false on a
// dev-installed app even while everything actually works; gating on it
// hid "+ Add player" permanently and looked exactly like a platform
// bug. Let the real roster speak for itself via getPlayers().
import { isOnDevice, session } from './board-adapter.js';

export function createRoster() {
  return isOnDevice ? createDeviceRoster() : createDevRoster();
}

// App-local stand-in players for when the real OS roster comes back
// empty (observed on real hardware with a dev-installed app). Two
// anonymous locals keep the game playable; real profiles take over
// automatically the moment the OS roster actually has someone in it —
// getPlayers() checks live on every call.
const LOCAL_FALLBACK_PLAYERS = [
  { playerId: 'local-p1', sessionId: -1, name: 'Player 1', type: 'guest', avatarId: '0' },
  { playerId: 'local-p2', sessionId: -2, name: 'Player 2', type: 'guest', avatarId: '0' },
];

function createDeviceRoster() {
  function servicesReady() {
    try {
      return session.areServicesReady();
    } catch {
      return false;
    }
  }

  // Session seeding attempt: if the session manager exists but has no
  // players, resetPlayers() ("reset to initial state — only active
  // profile remains") seeds it with the active profile. Harmless,
  // one-shot, retried if the bridge throws (services can connect late
  // during boot).
  let seeded = false;
  function ensureSeeded() {
    if (seeded || !servicesReady()) return;
    try {
      if (session.getPlayerCount() === 0) session.resetPlayers();
      seeded = true;
    } catch {
      // Leave seeded=false so a later call retries.
    }
  }

  return {
    // Humans only — AI players (if a session ever has one) are
    // filtered out. Falls back to two app-local stand-ins whenever the
    // real roster comes back empty.
    getPlayers() {
      ensureSeeded();
      try {
        const players = session.getPlayers().filter((p) => p.type !== 'ai');
        if (players.length > 0) return players;
      } catch {
        // fall through to the local stand-ins
      }
      return [...LOCAL_FALLBACK_PLAYERS];
    },

    // Whether "+ Add player" makes sense: only when the OS selector
    // overlay is actually connected (adding to the local fallback
    // roster isn't a thing — it always has exactly two stand-ins).
    canAddPlayers() {
      return servicesReady();
    },

    // OS player selector overlay; resolves true if someone was added.
    async presentAddPlayer() {
      if (!servicesReady()) return false;
      try {
        return await session.presentAddPlayer();
      } catch (error) {
        console.warn('[roster] presentAddPlayer failed:', error);
        return false;
      }
    },
  };
}

function createDevRoster() {
  const players = [
    { playerId: 'dev-p1', sessionId: 1, name: 'Alex', type: 'profile', avatarId: '0' },
    { playerId: 'dev-p2', sessionId: 2, name: 'Riley', type: 'profile', avatarId: '0' },
  ];
  let nextGuest = 1;

  return {
    getPlayers() {
      return [...players];
    },
    canAddPlayers() {
      return true;
    },
    async presentAddPlayer() {
      players.push({
        playerId: `dev-guest-${nextGuest}`,
        sessionId: 2 + nextGuest,
        name: `Guest ${nextGuest}`,
        type: 'guest',
        avatarId: '0',
      });
      nextGuest++;
      return true;
    },
  };
}
