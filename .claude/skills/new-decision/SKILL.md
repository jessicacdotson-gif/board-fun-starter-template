---
name: new-decision
description: Record an Architecture Decision Record (ADR) in docs/decisions/. Use when a notable decision has been made — technology choice, design direction, something cut — so the reasoning survives across sessions.
---

# New decision record

1. Find the next number: list `docs/decisions/`, take the highest
   `NNNN-` prefix, add 1 (zero-padded to 4).
2. Ask the user (or take from context if the conversation already
   contains it):
   - a short kebab-case title,
   - what was decided,
   - what the alternatives were and why they lost,
   - what this commits us to / costs us (consequences).
3. Write `docs/decisions/NNNN-<title>.md` following the structure of
   `docs/decisions/0000-adr-template.md` (Status / Date / Context /
   Decision / Reasoning / Consequences). Date = today. Status =
   accepted unless told otherwise.
4. If the decision supersedes an earlier ADR, add a "Superseded by"
   line to the OLD file — never rewrite its content; ADRs are history.
5. If the decision resolves an open question in `docs/spec/` or a
   `[!CONFLICT]` in the inbox, update that reference in the same
   commit.
