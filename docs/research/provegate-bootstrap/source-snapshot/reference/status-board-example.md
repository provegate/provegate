# Emofy Platform — Cross-Agent Status

> **Son güncelleme:** 2026-07-22 | **Toplam PRD:** 396 implemented (through PRD-418). SSOT: `_state/prds.json`.
> **Kural:** Task başlarken "Aktif Agent'lar" tablosuna yaz; bitince çıkar. Uzun özet **yalnızca** `_docs/completed/summary-*.md`.

---

## Aktif Agent'lar

| Agent | PRD | Phase | Started |
| ----- | --- | ----- | ------- |

---

## Mevcut durum

> Elle senkronize; makine SSOT `pnpm state:index` / `_state/prds.json`. Çelişirse makine kazanır.
> status-sync yalnızca "Aktif Agent'lar" tablosunu lock'la doğrular — bu tabloyu değil, o yüzden elle taze tut. (PRD-312: generate et.)

| Metrik               | Değer                                    |
| -------------------- | ---------------------------------------- |
| Implemented PRD      | 396                                      |
| Latest Ship Verified | PRD-418                                  |
| Latest Code Complete | PRD-388 (consumer personal apps surface) |
| Aktif worktree       | —; kuyruk: `pnpm prd:queue`              |

### Son Ship Verified (kısa)

Son ship'ler `## Son aktiviteler`; tam liste `_docs/completed/summary-*.md` + `pnpm state:index`.

### Sonraki adaylar (özet)

- **2026-07-22** (prd:autorun) PRD-418 **Ship Verified** — archived via autorun; expand `summary-418-workflow-hygiene-precleanup.md`.

- **2026-07-22** (prd:autorun) PRD-402 **Ship Verified** — archived via autorun; expand `summary-402-consumer-intelligence-surface-gating.md`.

- **2026-07-22** (prd:autorun) PRD-407 **Ship Verified** — archived via autorun; expand `summary-407-marketing-conversion-funnel-wiring.md`.

- **2026-07-22** (prd:autorun) PRD-398 **Ship Verified** — archived via autorun; expand `summary-398-ema-runtime-web-activation.md`.

- **2026-07-22** (prd:autorun) PRD-397 **Ship Verified** — archived via autorun; expand `summary-397-ema-store-catalog-publish-coverage.md`.

- **2026-07-22** (prd:autorun) PRD-417 **Ship Verified** — archived via autorun; expand `summary-417-tasks-child-surface-row-scope.md`.

- **2026-07-21** (prd:autorun) **384/385/386/387/389/390/391/392/393/394/395/396 Ship Verified** — next-wave + authz epici (384/385 log-inert dark-ship); her biri `summary-<id>-*.md`.

- **2026-07-20** (prd:autorun) PRD-388 **Ship Verified** — archived via autorun; expand `summary-388-consumer-personal-apps-surface.md`.

- **2026-07-20** (prd:autorun) PRD-380 **Ship Verified** — archived via autorun; expand `summary-380-convex-pg-sync-hardening.md`.
- **2026-07-20** (prd:autorun) PRD-376/377/378 EMA wave **Ship Verified** — archived; `summary-37{6,7,8}-*.md`.

- **2026-07-20** (prd:autorun) PRD-373/379 **Ship Verified** — archived; `summary-37{3,9}-*.md`.

- **2026-07-19** (prd:autorun) PRD-372/374 **Ship Verified** — archived; `summary-37{2,4}-*.md`.
- **2026-07-19** (claude-fable) PRD-371 **Ship Verified** — backend audit remediation; panel 3/3; DEPLOY SIRASI: frontend'ler ÖNCE (V1 envelope); `summary-371-*.md`.
- **2026-07-18** (claude-w7) PRD-335 **Operator Verification** — W7 paralel 3/3, DALGA TAMAM; panel 4/4 (FR-4 dürüst-ratchet, dark-AA colorsDark, 2 ölü gate wire'landı); `summary-335-*.md`.
- **2026-07-18** (claude-w7) PRD-337 **Operator Verification** — W7 paralel 2/3; panel 4/4 (2 P1: disabled-gate runtime + self-verifying contract spec); `summary-337-*.md`.
- **2026-07-18** (claude-w7) PRD-339 **Operator Verification** — W7 paralel 1/3; panel 4/4 (2 P0+9 P1: auth-plane→EMA-API devri, Convex konum org-gated, IDOR); ADR-069; `summary-339-*.md`.

- **2026-07-18** (prd:autorun) **335/336/337/339/365/323/369/370 Ship Verified** — archived via autorun; her biri `summary-<id>-*.md`.

- **2026-07-18** (claude-w7) PRD-365 **Operator Verification** — W7 seri 3/3; panel 4/4 (1 P0+2 P1+8 P2 fix: C4 sunucu-sınırı maske, simetrik son-vasi, health-write kategori); `summary-365-*.md`.
- **2026-07-18** (prd:autorun) PRD-323 **Operator Verification** — W7 2/3; panel 4/4 (3 P1 düzeltildi: identity_verified kilidi, iptal-zombi, deletedAt yanlış-sinyal); ADR-068; `summary-323-*.md`.

- **2026-07-18** (prd:autorun) PRD-336 **Operator Verification** — W7 1/3; panel 4/4 (2 P0 + 3 P1 düzeltildi; media_albums flag-seed latent bug dahil); ADR-067; `summary-336-*.md`.

- **2026-07-17** (prd:autorun) **W4-W5 10× Ship Verified** — 316/320/324/327/328/332/333/338/345/346/354/356/364; panel 4/4; ADR 062/065/066; her biri `summary-<id>-*.md`.
- **2026-07-17** (prd:autorun) PRD-367 **Operator Verification** — merged to LOCAL development, machine gates green; operator-gated: LIVE iyzico round-trip + deny-bypass bucket check before push.
- **2026-07-16** (prd:autorun) **355/351/358/317/334/359 Ship Verified** — archived via autorun; her biri `summary-<id>-*.md`.
- **2026-07-16** (prd:autorun) **D6-D7 8/8 Ship Verified** — 315/329/330/340/341/348/352/357; her biri `summary-<id>-*.md` + `_docs/reviews/review-<id>-*.md` (panel 4/4).
- **2026-07-15** (prd:autorun) **D4-D5 12/12 Ship Verified** — 318/319/321/322/325/342/344/347/353/361/362/363; `summary-<id>-*.md`.
- **2026-07-14** (prd:autorun) **D1-D3 8/8 Ship Verified** — 326/331/343/349/350/360 (+ 313/314 wave-1); `summary-<id>-*.md`.
- **2026-06-30** (prd:autorun) PRD-312 **Ship Verified** — `summary-312-parallel-agent-orchestration.md`.

- **Çocuk verisi dalgası 212–218 — SHIP VERIFIED ×7** (Operator Acceptance, arşivli); operatör/hukuk gate'leri: `_plans/child-data-wave-closure-2026-06-13.md`.
- **PRD-144** — Convex push + soak; engeller kalktı (211 rebuild CLI + pending_count) — bkz. core-flows operator seti O7.
- PRD adayları (deferral değil): kapanış raporu §5 — web attachment upload, org-context reconciliation, apps 6 rotasız mutation, comment attachments, org'suz cold-start UX.
- **Backend ~62 test drift (REPO-HEALTH)** — ÇÖZÜLDÜ 2026-07-22 (test-only `5b9065588`): PRD-389 idempotency 7 spec + PRD-384 authz-guard harness 10 e2e; suite yeşil; 417-dışı.
- **Backend test repair (REPO-HEALTH)** — ✅ ÇÖZÜLDÜ (PRD-271 base hygiene): 57 stale-role backend testi (9-rol rename drift) düzeltildi + `verify:env-ssot` org-created-bridge reconcile.
- **Frontend test debt (REPO-HEALTH)** — ✅ ÇÖZÜLDÜ (2026-07-14 base hygiene): consumer convex-mock drift ×5 + stale-rol `admin`→`owner`;
  native ≤16ms flake → `jest.retryTimes(3)`. Consumer 653/653, native 1104/1104 yeşil.

---

## Bekleyen follow-ups

> **Kural:** Her satır `Sahip` + `Vade` (YYYY-MM-DD) + `Yenileme` (sayaç, 0) taşır.
> Vadesi geçen satır `verify:deferred` gate'ini kırar — gerekçeyle yenile (`Yenileme` +1) ya da PRD'ye çevir.
> Bir satır en fazla **bir kez** yenilenir; `Yenileme > 1` gate'i kırar. Cap: iki tablo toplam 15 satır.
> **Cap doluyken:** önce en eski satır PRD'ye çevrilip silinir, sonra yeni satır eklenir — deferral kaydetmemek seçenek değildir.

| Konu                                       | PRD     | Sahip       | Vade       | Yenileme | Not                                                             |
| ------------------------------------------ | ------- | ----------- | ---------- | -------- | --------------------------------------------------------------- |
| Screenshot API + catalog shims (opsiyonel) | PRD-181 | engineering | 2026-08-01 | 0        | `_tasks/completed/tasks-181-app-creation-wizard-unification.md` |

> **2026-07-14 cap-relief (operatör kararı):** push/deploy-bağımlı 10 OVERDUE satır (144, 172, 185, 196,
> 198, 199, 200, 202, 204, 218) tek konsolide **PRD-366** `deployment-activation-program`'a çevrildi —
> kaynak eşlemesi PRD-366 §2. 184/182 (Unistyles-blocked) `## Deferred`'a taşındı.

---

## Deferred

| Konu                              | PRD     | Sahip       | Vade       | Yenileme | Not                                                                   |
| --------------------------------- | ------- | ----------- | ---------- | -------- | --------------------------------------------------------------------- |
| Eng backlog (029/096/114)         | PRD-029 | engineering | 2026-09-01 | 0        | Tiptap, presence layout, SDK testler                                  |
| Variant `default→solid` + CI a11y | PRD-109 | engineering | 2026-09-01 | 0        | future                                                                |
| Native bundle delta + EAS env     | PRD-184 | engineering | 2026-09-01 | 1        | 07-14 taşındı: Unistyles/SDK55 SSR blocker; `native-bundle-delta.mjs` |
| Chromatic + parity + web Unistyle | PRD-182 | engineering | 2026-09-01 | 1        | 07-14 taşındı: aynı Unistyles blocker; `tasks-182-*.md`               |

### Bilinen blocker

- `pnpm build --filter @emofy/consumer` known-warning: offline prerender token-fetch fails; `@/lib/auth/token` call-site predates PRD-341 (`9bb18ce0a`); build 16/16 exit 0.

---

## Son aktiviteler

Uzun changelog burada tutulmaz. Son 90 gün: `git log --oneline -n 30`. PR başına özet: `_docs/completed/summary-*.md`.

- **2026-07-21** (prd-395) PRD-361 follow-up (real-PG pickup roster izolasyonu) **PRD-395'e devredildi** — floor 3 yüzeye (pickup/messaging/storage) genişledi.

- **2026-07-15** PRD-344 SMS/digest/quiet-hours **Operator Verification** — panel 4/4; ADR-051; SMS deploy'da inert (creds+flag+verify); detay `summary-344-*.md`.

- **2026-07-15** (prd-325 conduct) PRD-325 hesap DSAR self-servisi **Operator Verification** — kod-tam, panel 4/4; ADR-050 + wiki; operatör canlı export/silme + `db:migrate`.

- **2026-07-14** (prd:archive) PRD-306 **Ship Verified** — Operator Acceptance rayvaz (4 handoff accepted-not-run); arşiv: `summary-306-org-deletion-cascade-convex-sync.md`.

- **2026-06-29** (prd:autorun) PRD-307→311 **Ship Verified** — platform event firehose/delivery-health/catalog/replay + spike; `summary-3{07..11}-*.md`.
- **2026-06-29** (prd:autorun) PRD-301/302/304/305 **Ship Verified** — backend standards wave; `summary-30{1,2,4,5}-*.md`.
- **2026-06-26** (prd:autorun) PRD-287/288/290 **Ship Verified** — authz cache-invalidation, filter-resource scoping, ABAC operator engine; `summary-2{87,88,90}-*.md`.
- **2026-06-25** (prd:autorun) PRD-273→284 + 289 **Ship Verified** — authorization control-plane wave + admin workspace UX; `summary-2{73..84,89}-*.md`.
- **2026-06-24** (prd:autorun) PRD-270/271/272/278 **Ship Verified** — RDS governance contracts + authz decision-service/api/package-foundation.
- **2026-06-22** (prd:autorun) PRD-264→269 **Ship Verified** — token SSOT + ramarkable domain consolidation; `summary-26{4..9}-*.md`.
- **2026-06-21** (prd:autorun) PRD-260→263 **Ship Verified** — legals SSOT, docs drift guard, error catalog, SDK reference.
- **2026-06-20** PRD-257/258/259 **Ship Verified** — onboarding, native auth flows, account child passport (259 OA: KVKK/on-data).
- **2026-06-18/19** PRD-250→256 **Ship Verified** — convex authz/cleanup, seed consolidation, `@emofy/ids` leaf (253), org-role rename, auth redesign.
- Daha eski (≤249): `git log --oneline` + `_docs/completed/summary-*.md` (workflow/audit detayları `_plans/`).

---

## PRD özeti

- Makine: `_state/prds.json` (+ `pnpm state:index`).
- İnsan özeti: `docs/ai-context/wiki/current-state.md`.
- PR başına: `_docs/completed/summary-*.md`.

## Dosya referansları

| Tür             | Konum               |
| --------------- | ------------------- |
| Tamamlanan PRD  | `_prds/completed/`  |
| Tamamlanan task | `_tasks/completed/` |
| Aktif PRD       | `_prds/wip/`        |
| Aktif task      | `_tasks/wip/`       |
