# Hardware session checklist

Device time is scarce — decide what to test BEFORE you're standing at
the Board, so zero minutes are spent deciding what to check. This is
the template's generalized version of the checklist that ran our real
hardware sessions; check items off and file findings in
`docs/wiki/raw/` with dates.

Bring: this list, every physical piece in your set, a second person
(for the multiplayer items), and a way to note results.

## Setup (once per machine)

- [ ] `board-connect pair`
- [ ] `npm run build:debug && npm run pack:debug`
- [ ] `board-connect install <debug-appId>.webapp.zip --launch`

## A. Glyph ID discovery (if your game uses pieces)

- [ ] Place each piece one at a time; record every glyphId →
      archetype mapping into `src/pieces.js`.
- [ ] Place duplicate pieces of one type simultaneously: confirm they
      share a glyphId but hold distinct contactIds.

## B. Contact-model semantics (re-verify on YOUR device/OS build)

- [ ] Removal: lift a piece — does an explicit Ended/Canceled frame
      ever arrive, or does it just vanish from the snapshot? (Our
      device: vanish only. The event log answers this directly.)
- [ ] Bare finger tap: does it report `type: Finger`, or
      `type: Glyph, glyphId: 0`? (We've seen both across sessions.)
- [ ] Already-down subscribe: place a piece BEFORE launching — what
      phase does it first appear with?
- [ ] contactId stability: does it survive a slide? A quick
      lift-and-replace?
- [ ] `isTouched`: touch/release a placed piece — does it toggle?
      latency?
- [ ] Orientation calibration, per piece type that has a "front":
      align the piece's front to screen-right — what does the SDK
      report? (Ours was −90° off on the piece we calibrated. Never
      assume; calibrate each type.)
- [ ] Blob contacts: does a resting palm/forearm produce
      `type: Blob`? Does a hand resting ON a piece produce a phantom
      finger contact?

## C. Multiplayer items (needs a second person)

- [ ] Two fingers from two people simultaneously — both contact
      streams clean and independent?
- [ ] Two pieces moved simultaneously — any dropouts?
- [ ] Ergonomics: seated where you'd actually play, which regions can
      each person comfortably reach? (Feeds zone design —
      docs/spec/player-identity.md.)

## D. Main game deploy sanity check

- [ ] `npm run deploy` — pinned-appId pipeline end-to-end.
- [ ] `board-connect apps` — game + debug tool coexisting with
      distinct ids?
- [ ] `board-connect screenshot --out shot.png` — grab evidence for
      the records.

## E. While you're there (cheap, opportunistic)

- [ ] `board-connect capabilities` — record OS version + feature tags
      in `docs/config.md`.
- [ ] Anything the current design assumes but hasn't verified? Check
      `docs/spec/requirements.md` open questions before you leave.
