---
name: ci-capability-omission-not-token-omission
description: >-
  In GitHub Actions, omitting the auth secret does not remove the capability: job-level
  `id-token: write` enables npm OIDC trusted publishing with no token at all, and
  actions/checkout persists authenticated git credentials by default. Enforcement by
  omission means removing permissions, persisted credentials, and secret references —
  per job — not hiding one env var.
type: gotcha
scope: workflow
status: active
links: [push-is-human-by-omission]
provenance: PRD-039 (readiness iterations 1-2; PRD cut, lesson survives)
watch: [.github/workflows/**]
---

PRD-039's first dry-run design for the Release workflow claimed safety by omission: the
dry path skipped the publish step and never materialized `NODE_AUTH_TOKEN`, "so it
cannot publish even if every other guard fails." The independent scorer refuted it with
two platform facts:

1. **`id-token: write` is a publish capability on its own.** npm trusted publishing
   authenticates via OIDC using that permission — no `NODE_AUTH_TOKEN` needed. A
   workflow-level `permissions` block grants it to every job, including the "safe" one.
2. **`actions/checkout@v4` persists authenticated git credentials by default.** Any
   later step in the same job can push. `persist-credentials: false` is the opt-out,
   not the default.

**Why:** [[push-is-human-by-omission]] says give the code path no capability, not a
conditional. In CI the capability set is wider than the secret: it is job `permissions`
+ persisted credentials + every `secrets.*` reference. Omitting one member while the
job keeps the others is a conditional wearing omission's clothes.

**How to apply:** isolate the unprivileged path in its own job with `contents: read`,
no `id-token` key, `persist-credentials: false` on checkout, and zero `secrets.`
references; keep the privileged job behind an explicit opposite-polarity condition; pin
each absence with its own deny check (a planted breach per capability). Review any
"safe mode" added to a privileged workflow against the full capability set, never the
token alone.
