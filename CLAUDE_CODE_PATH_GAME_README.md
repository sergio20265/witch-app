# Claude Code Notes: My Path Mini-Game

This file documents the familiar/dragon mechanics added around `2026-06-28`.
It is meant as a handoff map for future Claude Code sessions.

## Changelog

### 2.13 (2026-06-29) — Claude Code: per-type interactions + skill acceleration

- **Per-type familiar interactions** (`interactionsByType` in `src/lib/path.ts`):
  2 flavored templates for each of the 13 types; typed familiars draw from their
  own + the 7 generic templates, neutral universals use only the generic ones.
- **"Own familiar speeds skills" strengthened**: `familiarAffinityBonus` no
  longer only amplifies already-granted affinity — each active step a familiar
  pushes its own type (bond ≥3 → +1, ≥8 → +2; two stack; mixed pair still muted).
- **Own-path mastery shown in profile** (`Мастерство пути · <tier>`) from
  affinity to the witch's own type, so the acceleration is visible.
- Bump 2.12 -> 2.13 (versionCode 23).

### 2.12 (2026-06-29) — Claude Code: familiar roster, dragons, scenes

- **+16 familiars** (`src/data/path.ts`): a second per witch type (panther, unicorn,
  badger, mouse, redpanda, whitecat, meerkat, otter, swallow, firefly, spider,
  boar, bat) plus 3 neutral universals (capybara, tabby, ferret). Portraits +
  icons added. Universals carry no `familiarAffinity` entry and are treated as
  neutral (own/foreign/neutral classification in `familiarInfluence`,
  `activeFamiliars` validates by id, profile shows "вольный спутник").
- **4 dragons** instead of one (`dragons[]` + `dragonById`): mountain/forest/
  storm/mist, each with own art (`path-dragon`..`path-dragon4`). Encounters pick
  an un-befriended dragon; `PathState.dragonFriends[]` collects them (legacy
  `dragon` bool still honored). Profile lists all dragon friends.
- **Skill mastery tiers** (2.11) retained.
- **6 universal scenes + 26 track-dedicated scenes** (2 per track) in
  `src/data/pathEvents.ts`, each with unique art (`path-<track>-1x`).
- **13 signature amulets** — one per witch type, granted only in that track's
  scene-1 (`sig-<type>` in `trinkets`).
- Bump 2.11 -> 2.12 (versionCode 22).

### 2.11 (2026-06-28) — Claude Code: balance fixes + content

- **Fixed familiar over-spawn (was a regression of the original complaint).**
  In `deriveStep`, the 12% familiar-interaction band leaked into the
  new-familiar branch when the player had **no** familiar to interact with, so
  newcomers met familiars ~28% of the time instead of 16%. Interaction band now
  only exists when a familiar is present (`famStart = interaction ? 12 : 0`).
  Verified: no-familiar 16%, has-familiar 5%.
- **`dragonChance` now respects the muted rule** — a native+foreign familiar
  pair no longer boosts dragon odds (consistent with influence muting).
- **Witch skills expanded into mastery tiers (plan 6).** Each of the 13 crafts
  has 3 tiers (`начатки → умение → мастерство`) in `CRAFT_GIFTS`
  (`src/data/identities.ts`), unlocked by affinity thresholds `[3, 6, 10]`
  (`craftTier`, `craftTierLabel`, `craftGiftsFor`). Profile shows the tier and
  all unlocked gift lines. This surfaces the "own familiar speeds up skills"
  mechanic (faster affinity → earlier tiers).
- **More path steps (plan 7).** Added 6 universal scenes (`tracks: ['*']`) in
  `src/data/pathEvents.ts`: `any-spring-in-stones`, `any-lost-child`,
  `any-old-bridge`, `any-strangers-fire`, `any-singing-stones`,
  `any-trifle-trade`. They appear on every track and spread affinity across
  types. Art falls back to a background until `path-any-*` images are added.
- Earlier (2.9–2.10): RNG hash avalanche fix, apology migrations, dragon
  encounter + befriend + profile, familiar cooldown after adopt, green-only
  bear+dragon gift, green forest scenes + rare-amulet/wanderer events.

### Still open (from the roadmap)

- +13 familiars (a second per witch type → 26) with art (plan 1).
- 2–3 dragon variants with art (plan 5).
- Per-track (non-universal) scene expansion beyond the shared 6.

## Key Files

- `src/storage/types.ts`
  - `PathState` now supports the new `familiars?: PathFamiliarState[]` array.
  - Legacy fields `familiar` and `familiarName` are intentionally kept for backward compatibility.
  - `PathFamiliarState` stores `{ id, name?, bond }`.

- `src/data/path.ts`
  - Constants:
    - `FAMILIAR_BOND_MIN = -5`
    - `FAMILIAR_BOND_MAX = 10`
    - `SECOND_FAMILIAR_BOND = 10`
  - There are 13 familiars.
  - `familiarAffinity` maps each familiar to a witch type.
  - `dragon` is the single current dragon definition.

- `src/lib/path.ts`
  - Main game engine.
  - New helpers exported for UI:
    - `activeFamiliars(state)`
    - `hasSecondFamiliarSlot(state)`
    - `familiarBondLabel(bond)`
  - New step kind:
    - `{ kind: 'familiarEvent', interaction }`
  - New commit function:
    - `commitFamiliarInteraction(...)`

- `src/screens/MyPath.tsx`
  - Renders familiar interaction steps.
  - Shows notes when a second familiar slot opens or a familiar leaves.
  - Familiar-event art uses the familiar portrait.

- `src/screens/MyProfile.tsx`
  - Shows one or two familiar cards.
  - Shows bond bar and bond label.
  - Allows naming each familiar separately.
  - Shows a short current influence hint: native companion, foreign companion, two foreign companions, or muted mixed pair.

- `src/styles/screens.css`
  - Adds `.familiar-bond` styles.

## Current Familiar Mechanics

- Existing saves with only `familiar` are normalized by `activeFamiliars()` into one familiar with `bond: 1`.
- New saves use `pathState.familiars`.
- Maximum active familiars: 2.
- A second slot opens when any familiar reaches `bond >= 10`.
- If a new familiar is accepted without a free second slot, it replaces the weakest current slot.
- If a familiar's bond reaches `-5`, it leaves.

## Random Step Mechanics

The path engine now includes:

- Rare dragon chance:
  - Base: `1%`.
  - Increased by strong own-type familiar bond.
  - Capped at `5%`.

- Familiar interaction chance:
  - `12%` when the player has at least one familiar.
  - Interactions can increase/decrease bond and add affinity.
  - Current interaction templates: companion's call, small find, uneasy step, quiet request, foreign sign, small quarrel, shared trail.

- Familiar encounter chance:
  - `16%` with no familiar.
  - `5%` with active familiar(s), after cooldown.
  - New familiar picks have a `35%` bias toward the current witch type's matching familiar.

- Event chance:
  - Kept high enough that familiar interactions do not starve normal path events.
  - Own-type familiars increase rare amulet-event preference.

## Familiar Influence Rules

Implemented in `familiarAffinityBonus()` and related helpers:

- Own-type familiar only:
  - Helps rare events and dragon chance.
  - Boosts matching affinity when the choice already grants that type.

- Foreign-type familiar only:
  - Boosts affinity for its own witch type when relevant.
  - This accelerates skill learning and crossroad pressure toward that type.

- Own + foreign mixed:
  - Influence is muted.
  - This follows the design note that one native and one foreign familiar dampen each other.

- Two foreign familiars:
  - Both can contribute if choices grant their types.
  - If future balance needs stronger forced drift, extend `familiarAffinityBonus()`.

## Known Follow-Ups

- Add type-specific familiar interaction templates if each witch type needs its own flavor.
- Add more dragon variants when assets/text are ready.
- Add migration if old saves need one-time conversion in storage rather than lazy compatibility.
- Consider adding tests or deterministic debug controls for specific step kinds.

## Verification

Last verified with:

```bash
npm.cmd run build
```

Build passed. Vite still reports existing warnings about chunk size and mixed static/dynamic imports.
