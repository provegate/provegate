---
'provegate': minor
---

The wiring audit now recognizes three more executing surfaces: git-hook bodies, the
verify bundle's declared membership, and non-verify `package.json` script bodies. Three
new config keys under `wiring` control what it reads — `wiring.scriptsDir` (default
`scripts/verify`), `wiring.hooksDir` (default `.githooks`), and `wiring.bundlePath`
(default `scripts/verify/verify-workflow.mjs`) — all repo-relative, lexically validated,
and containment-checked at read time. A check that was "wired nowhere" may be wired after
upgrading; that verdict change is the point of the release. The audit's report now also
lists the surfaces it actually read, so a surface lost to a non-conforming input is a
visible number rather than a silent absence.

An older CLI rejects an unknown `wiring` block, so upgrade the CLI first, then add the
keys. Downgrading back: remove the `wiring` block from your config before reverting the
CLI. A post-release revert on the package side must keep accepting the block as
deprecated-and-ignored, or ship the key removal as a stated migration step — deleting the
keys outright would strand every config that set them.
