---
name: append-only-manifest-union-driver
description: >-
  True append-only shared files (lockfile, changelog) get a git union merge-driver;
  modify-in-place shared files (a status board) must NOT — they are only subtracted from
  conflict surfaces and self-heal via regeneration.
type: gotcha
scope: workflow
status: active
links: [conflict-check-independent-of-override]
provenance: workflow-seed
---

In collision-free parallel orchestration, work-items serialize when their write-surfaces
overlap. Shared files everyone touches would overlap on _every_ item — forcing near-total
serialization. But there are TWO distinct classes, and conflating them corrupts data:

- **True append-only files** (a package manifest, a lockfile, a CHANGELOG): two items
  adding different lines don't actually clash. Declare these in `.gitattributes` with
  `merge=union` so parallel appends auto-resolve at merge time.
- **Modify-in-place shared files** (a status board whose cells hold single updated
  values): union merge **duplicates rows** instead of resolving them. Keep these OFF the
  union list; they self-heal via the next regeneration pass plus a freshness check.

Both classes are subtracted from every materialized conflict surface
(post-materialization, so a broad `**` glob can't false-conflict on them) — i.e. the
subtraction set is a **superset** of the union set.

**Why:** an append is not a real conflict, so union is safe there; an in-place cell edit
IS a real conflict, and union hides it by keeping both versions.
**How to apply:** Maintain two lists: the union-driver list (`.gitattributes`, true
append-only files) and the overlap-subtraction list (union list + modify-in-place shared
files). Never put a modify-in-place file under `merge=union`. Neither class is declared as
a Conflict Surface. Keep both lists as project config.
