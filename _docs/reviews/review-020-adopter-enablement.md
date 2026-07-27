# Independent Review: PRD-020 — Adopter Enablement

> **PRD:** PRD-020
> **Verdict:** pass
> **Reviewer:** codex CLI session (independent of the implementing agent)
> **Tool/Model:** OpenAI Codex CLI, read-only sandbox — a different model family from the implementer (Claude Opus 5)
> **Base SHA:** 75307471853a82448a97a9d20f8df981845cb8cd
> **Diff range:** 7530747..HEAD
> **Critical:** 0
> **High:** 0
> **Medium:** 1
> **Quorum:** 1/1 pass (single cross-model reviewer, three rounds)
> **Rounds:** 3 — rounds 1 and 2 both returned DO NOT CLOSE; every finding remediated
> **Date:** 2026-07-27

**The severity counts are OUTSTANDING findings.** Eleven findings were raised across the
three rounds and all eleven were fixed. The single Medium row is the cross-package turbo cache
gap, which is inherited and recorded as a deferral.

## Method

Three read-only rounds by a different model family, each scoped to the diff.

Round 1 was adversarial with two named attacks: *can an adopter who copies only the
manifest actually run every command in it*, and *does any README claim exceed what the
fixture asserts or what the code does*. Round 2 reviewed the remediation itself. Round 3
confirmed round 2's fixes and was pointed at the areas the earlier rounds had not examined
closely — the single-package README key by key, the FR-5 docs edits, and whether any
assertion in the new docs fixture passes for a reason other than the one it names.

Every factual claim was verified against source before being accepted. None was rejected.

## Round 1 — five blocking findings, all real

| # | Finding | Likelihood | Resolution |
| - | ------- | ---------- | ---------- |
| 1 | **Neither manifest was runnable as copied.** The single-package entry shipped a `classDefaults.hotfix` rule invoking `npm run test:smoke` — a script its own README called "probably not written yet". The first hotfix would fail at Phase 4 with an error about a missing script | routine | The rule moved out of the shipped file into the README as a snippet to add *after* writing the script. A declared deviation from task 1.1, which required the rule to be in the file |
| 2 | **Copying a cookbook manifest over the practices one deletes a gate silently.** `init.ts:102` writes `{ phases: { '7': [PACK_BRAIN_GATE] } }` for `--practices`; a file copy replaces it | routine | Both cookbook READMEs and the brownfield page say to merge keys. Round 2 then found the warning was in the wrong place — see below |
| 3 | **The brownfield ladder described an impossible sequence and a false green.** Rung 1 ran `gate init --practices`, which scaffolds everything; rung 2 then told the adopter to run `gate init`, which would skip it all. And rung 2 claimed an empty manifest makes `gate run` "walk the phases, run nothing, and report green" — false twice, because the built-in gates and the PRD's §11 commands run regardless | routine | Rewritten against `init.ts`. The two install modes write **different** manifests: `--practices` omits `phases["4"]` (inherits the floor), plain `gate init` writes `[]` (erases it). That asymmetry is now the point of the rung, and the test reads the literal out of `init.ts` |
| 4 | **The monorepo README contradicted the shipped script.** It said a differently located routes tree makes the check "pass vacuously"; `check.mjs:33-36` fails closed with exit 2 | routine | Corrected, and verified by running it |
| 5 | **Two hard-cap claims were false.** "Prose promising a deny test does not satisfy it" — it did: the pattern was unanchored and `lintPrd` compiles it with `m`. And the finite runner-prefix list refuses legitimate lines under `make` or `deno` | plausible | Pattern anchored with `^\s*-?\s*`; the READMEs now say to mirror the adopter's own `commands.allowedPrefixes` **in both places** |

Seven test defects were raised in the same round and all taken. The most consequential: the
cap assertion called `RegExp.test` rather than production, so a wrong-but-non-empty
`targetsMatch` would have passed. It now runs through `lintPrd` with the cookbook manifest,
covering armed / not-armed / satisfied, and the `m` flag production uses.

## Round 2 — three findings, all introduced by the remediation

This is what a confirming round is for.

| # | Finding | Likelihood | Resolution |
| - | ------- | ---------- | ---------- |
| 6 | **The overwrite warning sat after the instruction it must prevent.** Both READMEs opened with "copy this file" and warned about the deleted Phase 7 gate a hundred lines later | routine | Both now open with a **Before you copy** section. A test asserts the warning's position is above the copy instruction — mutation-checked by moving it back down |
| 7 | **"Runnable as copied" became an unconditional claim** while the four floor commands are still the adopter's own scripts | routine | Corrected to the property that is true and worth protecting: the file **declares no script you would have to write first** |
| 8 | **The hard-cap guidance contradicted itself** — three elements called load-bearing, then the runner prefix called "the one thing to keep", inviting removal of the anchor that had just fixed finding 5 | routine | Rewritten so the anchor is named as the element that survives adaptation |

Plus one test-coverage finding: the runner-prefix assertion tested four of the eight
prefixes the pattern advertises. It now reads the alternation **out of the pattern**,
requires every advertised runner to be one `commands.allowedPrefixes` would execute, and
pins the six that must not silently disappear. Two mutations prove it — dropping five
prefixes fails, and adding `make|deno` fails, which is what keeps the READMEs' "add it in
both places" instruction true.

## Round 3 — confirming, plus what two rounds had not examined

Round 2's four fixes: three **hold**, one **partially** — the runner-prefix pin covered six
of eight, so deleting `tsx` or `vitest` stayed green. Fixed by pinning the exact set.

Pointed at the areas the earlier rounds had skimmed, it found two more false claims, both
routine and both verified against source before being accepted:

| # | Finding | Likelihood | Resolution |
| - | ------- | ---------- | ---------- |
| 9 | **The `wiringExceptions` explanation was wrong about what the audit sees.** Both cookbook READMEs said `gate check --wiring` catches an orphaned `scripts/verify-*.mjs` **file**. `core/gates/wiring.ts:238` iterates `package.json` scripts matching `config.verifyScriptPattern` (`^verify:`); the filesystem is never scanned. A script file with no package script is invisible to the audit | routine | Both READMEs now say the package script is the trigger — which also makes Step 1's `"verify:route-guards"` line the thing that puts the check under the audit, not the copy |
| 10 | **The FR-5 quickstart edit created two contradictions.** It said the pack "does not wire itself" while `--practices` writes the Phase 7 validator into the manifest; and a later pre-existing paragraph still said `gate init` leaves an empty gate-free manifest, which is false for the mode the page now recommends | routine | The page names the one thing the pack wires and calls everything else a manual step; the later paragraph now distinguishes the two install modes the same way the brownfield page does |
| 11 | **Four assertions in the docs fixture passed for weaker reasons than they named** — `recommends --practices` was substring presence, rung/stop-here was a global count rather than a pairing, and the cross-link test combined a path string with a filesystem check the test itself constructed | plausible | The install assertion reads the shell fence; rungs are split and each must carry its own stop-here; link targets are parsed out of the Markdown and resolved. Each is mutation-checked |

## Closing note on the three rounds

Round 1: five findings. Round 2: three, all introduced by round 1's remediation. Round 3:
one partial pin plus two claims neither earlier round had looked at. Nothing in rounds 2
and 3 contradicted an earlier finding — the sequence converged, and every round's cost was
paid back by defects that were green against their own tests.

## Inherited dependencies

- `test/content-adoption.test.ts` reads `apps/docs/**`, outside this package's turbo cache
  key, so a root `pnpm test` can replay a stale green after a docs-only edit. The §11 rows
  run the package script directly and bypass turbo. Recorded as a deferral; the repo-wide
  fix is out of this Conflict Surface.
- In a scratch adopter repo built from the monorepo instructions, `gate check --wiring`
  passes while the practices pack's `verify-gates-wired.mjs` fails on the same repo — the
  packed script does not count manifest class defaults as an executing surface. This is the
  package-vs-script duplication STATUS.md already records and PRD-023 is scoped to fix. It
  is documented in the monorepo README so an adopter meets it with an explanation.

## Verdict

**pass.** Eleven findings across three rounds, zero outstanding. Nothing under
`packages/provegate/src/` was touched — verified independently by the reviewer.

The round costs were repaid twice. Round 1 found a cookbook that was not runnable as copied
and a documentation page whose most load-bearing sentence was false; round 2 found that the
fix for the second had introduced a warning placed after the action it was meant to prevent.
Both are the same class of defect and it is the class this work item is most exposed to:
**a claim that exceeds its mechanism**. Six of the eleven were exactly that, and none of
them was reachable by a test the implementer would have thought to write, because each one
was green against the artifact it described.
