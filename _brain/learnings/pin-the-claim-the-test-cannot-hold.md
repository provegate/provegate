---
name: pin-the-claim-the-test-cannot-hold
description: >-
  When a property is only observable on machines the suite will never run on, assert it
  against the source and say why — a behavioural test there is green by luck.
type: convention
scope: workflow
status: active
links: [two-parsers-wrong-together, fixture-must-reach-production-shape]
watch: [packages/provegate/src/core/memory/find.ts]
---
Deterministic recall promises the same bytes on any machine, and its tie-break used
`localeCompare`. That is locale-dependent: under some collations two slugs compare equal
and the store's own order survives instead. The fix is a code-point comparison.

The regression for it could not be written. Whether `localeCompare` and code-point order
DIFFER depends on the locale the test happens to run under, so a behavioural assertion
passes on the developer's machine either way — it is green by luck, and mutation-checking
confirms that: replacing the comparator changed nothing locally.

What works is asserting against the SOURCE, paired with the documented promise, and saying
in the test why it is written that way. Match the CALL (`.localeCompare(`) rather than the
word: the comparator's comment names `localeCompare` as the thing it avoids, and a
denylist that cannot tell a call from a mention deletes the note that explains the rule.

The same shape covers anything the suite cannot reach: platform-specific path separators,
timezone-dependent formatting, locale-dependent case folding. Some of those are better
REFUSED than approximated — Turkish dotted/dotless `i` makes case-insensitive matching
locale-dependent, so the miss is documented and asserted rather than fixed with a fold
that would reintroduce machine dependence.

**Why:** a test that cannot fail is worse than no test, because it is counted as coverage.
An honest source assertion plus a written reason is weaker evidence than behaviour, and
strictly better than false evidence.
**How to apply:** before writing a behavioural test for a portability property, ask what
would have to be true for it to FAIL on this machine. If the answer is "a different locale,
platform, or clock", assert the mechanism at the source, pair it with the docs claim so the
two move together, and record why in the test. Prefer a documented refusal to an
approximation whose result varies by machine. See [[two-parsers-wrong-together]] for the
usual rule this is the exception to.
