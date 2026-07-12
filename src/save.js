// Persistence layer: one continuous save per device. On the Board this
// uses the OS save service (Board.save via board-adapter); on
// desktop/dev it falls back to localStorage so the full save/continue
// flow is testable in a browser preview.
//
// The store exposes exactly two operations — load the one save (or
// null), and write the one save (create-or-update) — so swapping in
// multiple save slots later means widening this file, not touching
// callers.
import { isOnDevice, save as boardSave } from './board-adapter.js';

export function createSaveStore({ description, localStorageKey, version = 1 }) {
  let saveId = null; // Board save id once created/found (device only)

  async function loadState() {
    if (!isOnDevice) {
      const raw = localStorage.getItem(localStorageKey);
      return raw ? JSON.parse(raw) : null;
    }
    try {
      const saves = await boardSave.list();
      if (!saves.length) return null;
      // One-continuous-save model: use the first (a healthy install
      // only ever has one; extras would be leftovers from dev builds).
      saveId = saves[0].id;
      const bytes = await boardSave.load(saveId);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      // A broken save service shouldn't brick the boot — play unsaved.
      console.warn('[save] load failed, starting without a save:', error);
      return null;
    }
  }

  async function saveState(state, playedTimeMs = 0) {
    const json = JSON.stringify(state);
    if (!isOnDevice) {
      localStorage.setItem(localStorageKey, json);
      return true;
    }
    try {
      const bytes = new TextEncoder().encode(json);
      if (saveId !== null) {
        await boardSave.update(saveId, description, bytes, playedTimeMs, version);
      } else {
        const meta = await boardSave.create(description, bytes, playedTimeMs, version);
        saveId = meta.id;
      }
      return true;
    } catch (error) {
      console.warn('[save] write failed (state kept in memory):', error);
      return false;
    }
  }

  return { loadState, saveState };
}
