---
'provegate': minor
---

Add `valueScoring` to the config surface, and enforce the value-triage recompute at
`gate check`.

`workflow.config.json` gains an optional `valueScoring` block: an ordered `axes` list, a
`weights` map keyed by axis, and an optional `enforceFrom` cutoff. `gate check PRD-NNN`
now recomputes a work item's declared value total from those weights and refuses a header
whose arithmetic does not hold; `gate check --value-score` sweeps the whole corpus, which
is what catches a score edited after its item passed readiness.

**Compatibility is one-way, so the order matters.** An older CLI rejects `valueScoring` as
an unknown config key. Upgrade the CLI first, then add the key; and if you downgrade,
remove the key first. Adding the key to a repository still running an older CLI turns every
command into a config error.

**Nothing changes for a config that does not set it.** The shipped default omits
`enforceFrom` entirely, which selects presence-triggered mode: an item with no value header
passes, and only an item that declares one has its arithmetic checked. A repository that
upgrades and adds nothing sees no new failures.

**The two keys have different merge rules, and both directions are legal.** Supplying
`valueScoring.axes` requires the complete matching `weights` set, and the pair replaces the
defaults wholesale — a partial axis list with inherited weights would score against a
dimension nobody declared. Supplying `weights` alone is a legal partial retune of the
default axes: move one weight and leave the rest, and the sum-to-1 rule catches it if the
result no longer adds up.

**Changing `axes` later is a corpus migration, not a config edit.** A header whose axis
list disagrees with the config fails, so run `gate check --value-score` first to see which
items would break, then land the axis change and the header rewrites in one commit.
