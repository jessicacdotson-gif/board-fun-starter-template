# Docs & memory system

This folder is both the design spec *and* the project's working
memory. It's built to survive across chat sessions, devices, and tools
— nothing important should live only in a conversation that can
disappear. When we built a real game on this system, it carried the
project across a phone → desktop migration and dozens of sessions
without losing a decision.

Two-part hybrid: ambient capture + curated knowledge.

## 1. `inbox/` — ambient capture

Zero-friction, append-only logging. When something comes up
mid-session — an idea, a decision, a "wait, we need to handle X" — it
gets appended to `inbox/log.md` as-is, with a date. No formatting
effort, no filing. Nothing here is "final" — it's raw material.

## 2. `wiki/` — curated, cited knowledge

Deliberate, compiled knowledge. `wiki/raw/` holds source material
worth keeping: SDK-doc excerpts, research, and — most valuable —
**findings verified against the real platform**, each dated and noting
how it was verified. Conflicts between sources get marked
`[!CONFLICT]` instead of silently overwritten.

The template ships with real findings from building a real game on
Board.fun hardware (`board-web-sdk-findings.md`,
`board-hardware-findings.md`, `board-deploy-findings.md`). They will
save you days.

## 3. `spec/` — requirements & design

The stable, "current understanding" documents: what we're building and
why, the backlog, and open questions **written down instead of
silently assumed**. Updated deliberately, not automatically.

## 4. `decisions/` — ADRs

One file per notable decision, with reasoning, so it never gets
relitigated or forgotten (`/new-decision` creates one). Superseded
ADRs are marked, never rewritten — they're history.

## Consolidation

Periodically (start of a session, or when `inbox/log.md` gets long),
run a consolidation pass: read new inbox entries, move each insight to
its permanent home (`wiki/raw/`, `spec/`, or a new ADR), flag
conflicts with existing docs. The inbox log itself is never deleted —
it stays as the raw historical record, marked as consolidated.
