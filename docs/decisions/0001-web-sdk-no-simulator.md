# 0001 — Stay on the Web SDK; accept real-hardware-only piece testing

**Status:** accepted (inherited from the project this template was
distilled from — it's the decision that shaped the template's whole
dev-harness design, kept as a worked ADR example)
**Date:** 2026-07-03

## Context

The Web SDK has no simulator — only the Unity SDK does (confirmed via
docs.dev.board.fun; originally logged as a `[!CONFLICT]` against a
draft that assumed one existed). So the choice was: Unity with an
in-editor simulator, or Web SDK with deploy-to-device as the only way
to test piece input.

## Decision

Stay on the Web SDK. Accept that all piece/finger input testing
happens on real Board hardware, with no in-editor simulation step.

## Reasoning

- The deciding factor: an agentic coding tool (Claude Code) reads and
  writes files and runs commands — it cannot drive Unity Editor's GUI
  (scene composition, prefab placement, inspector tuning). With
  Unity, the AI could only assist at the C# margins; plain JS/HTML is
  a project such a tool can drive end-to-end.
- The cost — a slower deploy-to-device loop for piece input — is real
  but bounded, and mitigated in code: `src/dev/fake-board.js`
  fabricates the SDK's documented contact semantics so everything
  EXCEPT real recognition is testable in a desktop browser.
- The piece-recognition model runs at the OS level and is shared
  across all SDKs — nothing is lost model-wise by this choice.

## Consequences

- Milestones assume a "deploy to real Board, test there" loop for
  anything piece-related; `docs/spec/hardware-session-checklist.md`
  exists to make that loop cheap.
- UI-only work stays previewable in a regular browser
  (`Board.isOnDevice === false` path).
- The fake harness is faithful to the DOCUMENTED semantics, which
  hardware then contradicted in one respect (no Ended frames — see
  board-hardware-findings.md): game code must never rely on anything
  the harness does beyond what's been verified on the device.
