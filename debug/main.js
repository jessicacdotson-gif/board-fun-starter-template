// Standalone diagnostic app for empirical glyphId discovery (no piece
// set ships with a published glyphId table — see docs/spec/
// glyph-discovery.md for the full walkthrough) and contact-lifecycle
// investigation on real hardware.
//
// This deploys as its OWN app (npm run build:debug / pack:debug),
// independent of the main game — build your diagnostic tooling before
// your game; it will teach you how the platform actually behaves.
//
// Two views:
// - "Current contacts" — live snapshot table, keyed by contactId (see
//   src/game.js for why glyphId alone isn't a safe key: duplicate
//   pieces share one glyphId). Shows whatever a contact's LAST known
//   state was — if a row is stuck showing an old phase, that's a clue
//   in itself, not a bug in this tool.
// - "Event log" — append-only, timestamped history of every contact
//   starting and ending, so stale rows in the snapshot table can never
//   be confused with something that just happened. An "ended" event
//   explicitly distinguishes two cases: the contact reported phase
//   Ended/Canceled before disappearing, vs. it simply vanished from
//   the frame snapshot with no terminal phase at all. That distinction
//   is how this project established the platform's real removal
//   semantics (docs/wiki/raw/board-hardware-findings.md) — and the
//   timestamped log exists because a snapshot table alone once led us
//   to a false hypothesis mid-hardware-session.
import { isOnDevice, subscribe, BoardContactType, BoardContactPhase } from '../src/board-adapter.js';

const statusEl = document.getElementById('status');
const rowsEl = document.getElementById('rows');
const eventsEl = document.getElementById('events');
const clearButton = document.getElementById('clear');

const seen = new Map(); // contactId -> last known contact
const startedAt = new Map(); // contactId -> performance.now() when first seen
const MAX_EVENTS = 300;
const events = []; // newest first

function labelOf(enumObj, value) {
  return Object.keys(enumObj).find((key) => enumObj[key] === value) ?? value;
}

function timestamp() {
  return new Date().toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
}

function logEvent(html) {
  events.unshift(`<div>[${timestamp()}] ${html}</div>`);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  eventsEl.innerHTML = events.join('');
}

function renderSnapshot() {
  rowsEl.innerHTML = '';
  for (const [contactId, contact] of seen) {
    const row = document.createElement('tr');
    if (contact.phase === BoardContactPhase.Began) row.className = 'began';
    row.innerHTML = `<td>${contactId}</td><td>${labelOf(BoardContactType, contact.type)}</td><td>${contact.glyphId}</td><td>${labelOf(BoardContactPhase, contact.phase)}</td><td>${contact.x}</td><td>${contact.y}</td><td>${contact.orientation}</td><td>${contact.isTouched}</td>`;
    rowsEl.appendChild(row);
  }
}

function isEndPhase(phase) {
  return phase === BoardContactPhase.Ended || phase === BoardContactPhase.Canceled;
}

function onFrame(contacts) {
  const nowSeen = new Set();

  for (const contact of contacts) {
    const { contactId } = contact;
    nowSeen.add(contactId);
    const typeLabel = labelOf(BoardContactType, contact.type);

    if (!seen.has(contactId)) {
      startedAt.set(contactId, performance.now());
      logEvent(`<span class="start">STARTED</span> contactId=${contactId} type=${typeLabel} glyphId=${contact.glyphId}`);
    }

    if (isEndPhase(contact.phase)) {
      const duration = Math.round(performance.now() - (startedAt.get(contactId) ?? performance.now()));
      logEvent(`<span class="end">ENDED</span> contactId=${contactId} type=${typeLabel} glyphId=${contact.glyphId} — explicit ${labelOf(BoardContactPhase, contact.phase)} frame received, lasted ${duration}ms`);
      startedAt.delete(contactId);
    }

    seen.set(contactId, contact);
  }

  // Reconciliation: anything tracked but absent from this frame vanished
  // without ever reporting Ended/Canceled — logged explicitly, per
  // contact, with a timestamp.
  for (const [contactId, contact] of seen) {
    if (!nowSeen.has(contactId) && startedAt.has(contactId)) {
      const duration = Math.round(performance.now() - startedAt.get(contactId));
      logEvent(`<span class="end vanished">ENDED</span> contactId=${contactId} type=${labelOf(BoardContactType, contact.type)} glyphId=${contact.glyphId} — vanished from snapshot, NO Ended/Canceled frame ever seen, lasted ${duration}ms`);
      startedAt.delete(contactId);
    }
  }

  renderSnapshot();
}

clearButton.addEventListener('click', () => {
  seen.clear();
  startedAt.clear();
  events.length = 0;
  renderSnapshot();
  eventsEl.innerHTML = '';
});

if (isOnDevice) {
  statusEl.textContent = 'On device — place pieces and touch the bare screen; every contact type is tracked.';
  subscribe(onFrame);
} else {
  statusEl.textContent = 'Not running on Board hardware — no piece input here (the Web SDK has no simulator). Deploy via board-connect to test on the real device.';
}
