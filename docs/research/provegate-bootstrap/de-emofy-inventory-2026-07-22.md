# De-Emofy'leştirme Envanteri — 7-Phase Gated PRD Workflow OSS Çıkarımı

> **Amaç:** Workflow'un generic çekirdeği ile Emofy-spesifik parçalarını ayırmak; OSS paket sınırını çizmek.
> **Yöntem:** 3 paralel envanter ajanı (scripts / prompts / templates+şemalar) + WORKFLOW.md analizi. 2026-07-22.
> **Sınıflar:** **G**ENERIC (olduğu gibi çıkar) · **P**ARAMETERIZE (mantık generic, Emofy değerleri → config) ·
> **D**OMAIN (Emofy-özel; OSS'de kullanıcı plugin'i) · **IG** INFRA-GLUE (repo tutkalı, at).

---

## 1. Yönetici Özeti

| Katman                                     | Hacim           | Generic oranı                            | Baskın sınıf                |
| ------------------------------------------ | --------------- | ---------------------------------------- | --------------------------- |
| Scripts (makine katmanı, 37 dosya)         | ~6.240 LOC      | mantık ~%90 generic, değerler değil      | **P** (33/37 dosya)         |
| Domain verify:\* gate'leri (~55 dosya)     | kapsam dışı     | %0                                       | **D** (tamamı plugin)       |
| Faz promptları (15 dosya)                  | 2.347 LOC       | ağırlıklı ~%46 (çekirdek 10 dosyada %53) | karışık                     |
| Şablonlar + şemalar + config (17 artifact) | ~1.669 satır    | yüksek; kuplaj blok-şekilli              | ayrılabilir                 |
| WORKFLOW.md                                | ~820 satır      | ~%60                                     | ayrılabilir (bölüm bazında) |
| **Toplam çıkarım yüzeyi**                  | **~11.000 LOC** |                                          |                             |

**Ana bulgu:** Kuplaj **dağınık değil, tutarlı şekilli** — neredeyse her yerde değiştirilebilir blok/liste
halinde (bölüm, tablo, `checks[]` dizisi, checklist). Interleaved (yeniden-yazım gerektiren) istisnalar sayılı:
`phase-4-implementation-bootstrap.md` (%85 Cursor/Emofy), wiki page-taksonomisi (ingest/lint), phase-3 örnek
task ağacı, phase-6 Step-2 (Memory & Architecture Sync).

**İki config boğaz noktası her şeyi kontrol ediyor:**

1. `scripts/prd-state-utils.mjs` (524 LOC; ~60 script import ediyor) — dizin modeli (`_prds|_readiness|_tasks|_docs`
   × wip/completed/deferred), `STATE_PATH`, status sözlüğü, `EXECUTION_PHASES`, `SHARED_APPEND_ONLY`, Türkçe panel
   etiketleri, worktree modeli, markdown parserlar, sıfır-bağımlılık glob motoru.
2. `scripts/lib/base-branch-policy.mjs` (44 LOC) — korumalı branch seti + direct-commit izin listesi.

Bu ikisi + pnpm/turbo komut varsayımları config'e çekilince **33 P-dosyası peşinden geliyor.** OSS mimarisinin
`workflow.config.{json,mjs}` çekirdeği fiilen bu iki dosyanın parametre yüzeyi.

---

## 2. Katman 1 — Scripts (makine)

### 2.1 Sınıf dağılımı

| Sınıf    | Dosya | ~LOC   | Örnekler                                                                                            |
| -------- | ----- | ------ | --------------------------------------------------------------------------------------------------- |
| G        | 3     | ~380   | `sync-prd-state` (12), `verify-agent-locks` (76), `verify-gates-wired` (293) — olduğu gibi çıkar    |
| P        | 33    | ~5.730 | `prd-autorun` (378), `prd-worktree` (672), `verify-prd-ready` (434), `verify-path-conflicts` (256)… |
| D (saf)  | 1     | 127    | `prd-defer-oldest` (Türkçe tablo + "Ramazan Ayvaz" hardcode)                                        |
| IG (saf) | 0     | —      | yok; `verify-affected-tests` IG'ye yakın (pnpm+turbo `--filter`, `@emofy` layout)                   |

### 2.2 P-dosyalarının tipik kuplajları (config alanları)

- Base branch `"development"` (autorun'da her yerde), `PROTECTED_BASES={development,main,master,staging}`
- Dizin şeması: `.worktrees/`, `feat/prd-NNN-<slug>`, `_state/locks/`, `_state/acceptances.json`, PRD-NNN 3-haneli regex
- `_STATUS.md` Türkçe çapaları: "Aktif Agent'lar", "Son aktiviteler", "Mevcut durum", sahip/vade/yenileme
- `ACCEPTANCE_OWNERS = {"owner","rayvaz","operator"}` — **gerçek kişi adı hardcode; temizlenmeli**
- pnpm komut adları (state:sync, check-types/lint/build…), gate-adı listeleri
- PRD-numarası grandfather eşikleri (248/198/199/170) — Emofy tarihi; OSS'de sıfırlanır

### 2.3 Plugin dikiş yerleri (embedded-DOMAIN)

Dosya bütünü P ama içinde plugin'e dönüşecek domain parçası taşıyanlar:

- `verify-prd-ready` → MT&S cross-tenant-deny hard cap + Contract-test cap + DO-NOT `OrgScopedRepository`/`PERMISSION_MATRIX` zorunluluğu → **kullanıcı-tanımlı hard-cap plugin API'si**
- `verify-workflow` → `checks[]` dizisi (~50 gate; 13 makine + 37 Emofy domain) → **gate manifest** (kullanıcı config'i)
- `prd-class-gates` → sınıf→gate eşleme listeleri → manifest'in class-default bölümü
- `prd-worktree` → sharp/`apps/backend` native-dep hydration bloğu → generic **post-create hook**
- `verify-prd-state` → owner allowlist + grandfather eşikleri

### 2.4 Kapsam dışı

~55 domain `verify:*` script'i (authz-_, convex-_, ema-_, rds-_, token-_, event-_, org-\*, security-headers…)
tamamı **D** — OSS'de örnek plugin galerisi olarak 2-3 tanesi genericleştirilip gösterilebilir
(örn. permission-guard-coverage → "route-guard coverage" şablonu), gerisi çıkarım yüzeyinde değil.

---

## 3. Katman 2 — Faz Promptları

Taşınabilirlik sıralaması (generic %):

| Dosya                              | LOC        | Generic    | Not                                                                                                           |
| ---------------------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| phase-5-testing                    | 51         | %80        | "Run, don't list" + gate pseudocode saf metot; isim değişimiyle taşınır                                       |
| orchestration-runner               | 60         | %75        | **Mimari omurga:** stokastik-agent / deterministik-gate-runner ayrımı + 5-lens panel + invariantlar           |
| phase-2-readiness-scorer           | 211        | %70        | Skor motoru + hard caps + binary verdict = taç mücevheri; Emofy trailing-checklist bloğunda                   |
| phase-7-learning                   | 55         | %70        | Declared-artifacts-in-same-merge mekaniği generic                                                             |
| phase-1-prd-generator              | 202        | %55        | 12-bölüm şablon generic; §4/§5/DO-NOT örnekleri + References tablosu Emofy blokları                           |
| phase-3-task-generator             | 249        | %50        | Framework generic; skeleton kategori adları + örnek task ağacı + path tabloları **örnek-blok değişimi** ister |
| phase-4-implementation             | 178        | %50        | Task-file edit contract generic; komutlar Execution Loop'a dokunmuş → komut-placeholder şart                  |
| phase-6-final-auditing             | 309        | %45        | Panel/quorum/ship-gate generic; Step-2 Memory-Sync büyük interleaved Emofy bloğu                              |
| wiki-lint / wiki-ingest            | 105/213    | %45/%40    | Metot generic, sayfa taksonomisi Emofy — generic taksonomiyle değişir                                         |
| codex-phase-4-starter              | 222        | %40        | ⚠️ İçerik hâlâ "Phase 3" diyor (PRD-248 renumber drift'i) — çıkarım öncesi düzelt                             |
| phase-4-implementation-bootstrap   | 206        | %15        | Cursor adaptörü; **yeniden yazım** ya da "adapter" katmanına it                                               |
| bug-sweep / repo-cleanup / sis-ema | 117/114/55 | %45/%40/%5 | Faz prompt'u değiller. sis-ema → HARİÇ; repo-cleanup tamamı Türkçe                                            |

Çekirdek 10 metot dosyası: 1.633 LOC, ~%53 generic (~868 LOC).
Desen: **küçük dosyalar en değerli metodu taşıyor, kuplajları isim-düzeyinde** (find/replace); büyük dosyalar
(1, 3, 6) Emofy teknolojisini metodun yapısına örmüş (örnek-blok değişimi gerekir).

---

## 4. Katman 3 — Şablonlar, Şemalar, Koordinasyon

Ayrılabilirlik gradyanı (temiz → bağımlı):
`review şablonu ≈ task şablonu > agent-lock şeması > prd-state şeması > summary şablonu > readiness şablonu
(checklist bloğunda temiz dikiş) > PRD şablonu (§8/§11/§12) > cursor rules ≈ commitlint > _STATUS.md (tamamı Türkçe)`

| Artifact                             | Satır   | Durum                                                                                                                     |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `_docs/reviews/_TEMPLATE.md`         | ~30     | **En temiz birim.** PRD/Verdict/Reviewer/Base-SHA/Critical/Quorum metadata bloğu olduğu gibi çıkar                        |
| `_tasks/_TEMPLATE.md`                | ~121    | Frontmatter + Verification Ledger + Operator Handoff taksonomisi + checkbox disiplini saf generic                         |
| `agent-lock.schema.json`             | 85      | Lease modeli (agent+phase+TTL+touchedFiles+ownedPaths) generic paralel-agent primitifi; `$id` + PRD regex değişir         |
| `prd-state.schema.json`              | 217     | Kayıt şekli (4 bağlı artifact + readiness + task sayaçları + autonomous-close) reusable; artifactPath regex config        |
| `_readiness/_TEMPLATE.md`            | ~160    | 6-boyut ağırlıklı skor kartı generic; **~60 satırlık Emofy checklist'i etiketli swap-out bloğu**                          |
| `_prds/_TEMPLATE.md`                 | 301     | 3 gate bölümü (Conflict Surface / Durable Artifacts / §11) = workflow omurgası, generic; §8/§12 + Türkçe yorumlar değişir |
| `_STATUS.md` yapısı                  | 147     | Tablo şemaları (lock-aynası + sahip/vade/yenileme-cap'li deferral) taşınabilir yönetişim mekaniği; başlıklar İngilizceye  |
| `.gitattributes` union-merge         | 7 giriş | Append-only-manifest tekniği generic; dosya listesi config                                                                |
| commitlint / cursor rules / prd-land | ~370    | Şekil generic, içerik Emofy; prd-land'in "asla push etme" kuralı çekirdek ilke                                            |

**Boşluk bulgusu:** `_state/acceptances.json`'ın (operator-acceptance store) **şeması yok** — OSS'de baştan şemalı tasarla.

---

## 5. WORKFLOW.md (~820 satır)

- **Generic (~%60):** 7-faz modeli + gate tablosu, otonomi kesiti, PRD Class sistemi, kalibrasyon addendum'u
  (binary verdict + hard caps ilkesi), Status Model, Deferral Policy (yenileme-cap yönetişimi), branch izolasyon
  kuralları, Parallel Agents & Merge Train, Quick Reference. → OSS "method spec" dokümanının iskeleti.
- **Emofy (~%40):** Emofy-Specific Verification Checklist, class-default gate tablosundaki gate adları,
  Paperclip protokolü (zaten INACTIVE — çıkarımda AT), Cursor/IDE config tabloları, Git stratejisindeki
  Emofy branch/deploy detayı, PRD-tarihçesi provenance satırları.

---

## 6. Kesişen Kuplaj Kategorileri (her katmanda aynı 6 şekil)

| #   | Kategori                                                                                                         | Tedavi                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | `@emofy/*` paket adları + `apps/*`,`packages/*` yolları                                                          | config: `projectLayout`                                          |
| 2   | RBAC/multi-tenancy checklist'i (OrgScopedRepository, PERMISSION_MATRIX, 9 rol, ghost roles, guard pipeline)      | plugin: `projectChecks` (readiness + audit + DO-NOT + hard caps) |
| 3   | `pnpm verify:*` komut adları + pnpm/turbo varsayımı                                                              | config: `commands` + **gate manifest**                           |
| 4   | Model adları (tier rehberleri: Opus/GPT/Sonnet/Composer)                                                         | config: `modelTiers` (hızla eskiyor)                             |
| 5   | Türkçe içerik (\_STATUS.md başlıkları, panel etiketleri, şablon yorumları, repo-cleanup.md)                      | İngilizce yeniden yazım; OSS tek dil                             |
| 6   | Kişi/tarih hardcode'ları (`rayvaz`, "Ramazan Ayvaz", PRD-248/249 grandfather eşikleri, PRD-provenance satırları) | temizle/sıfırla                                                  |

---

## 7. Önerilen OSS Mimarisi (envanterin işaret ettiği)

```
gated/  (çalışma adı)
├── core/            # G + P scriptler, config-enjekteli
│   ├── config.ts    # prd-state-utils + base-branch-policy parametre yüzeyi:
│   │                #   dirs, statusVocab, branches, commands, idPattern, owners
│   ├── state/       # prds.json sync + query (lifecycle SSOT)
│   ├── locks/       # lease modeli + path-conflict glob motoru
│   ├── run/         # autorun gate-chain motoru (Faz 4-7 + local merge; asla push)
│   └── gates/       # gate manifest yürütücü + verify-gates-wired + doc-bloat + agent-locks
├── gates.manifest   # kullanıcı tanımlı: { phase4: [...], phase6: [...], classDefaults: {...}, hardCaps: [...] }
├── prompts/         # 10 çekirdek metot promptu, {{placeholder}} bloklu
│   └── adapters/    # cursor-bootstrap, codex-starter (tool-spesifik, opsiyonel)
├── templates/       # prd / readiness / tasks / summary / review + status-board (EN)
├── schemas/         # agent-lock, prd-state, acceptances (YENİ), review-artifact
└── examples/        # 2-3 genericleştirilmiş domain gate (plugin galerisi)
```

**AT listesi:** sis-ema promptu, Paperclip bölümü, sharp hydration bloğu, ~55 domain gate (galeri hariç),
PRD-tarihçesi provenance satırları. **Yeniden yazım:** phase-4-bootstrap (adapter), repo-cleanup (istenirse EN),
wiki taksonomisi (generic "knowledge-base" modeli).

## 8. Efor Kabası

| İş                                                        | Hacim      | Not                                                   |
| --------------------------------------------------------- | ---------- | ----------------------------------------------------- |
| Config boğaz refaktörü (2 dosya → config yüzeyi)          | orta       | 33 P-dosyasını açar; en yüksek kaldıraç               |
| Gate manifest tasarımı + `checks[]`/class-gates göçü      | orta       | Pazar analizindeki "pluggable gates" şartının kendisi |
| Prompt templating (10 dosya, ~770 Emofy LOC değişimi)     | orta       | Blok değişimi; 1/3/6 örnek-yeniden-yazım ister        |
| Şablon + şema genericleştirme                             | düşük      | Blok-swap; acceptances şeması yeni yazılır            |
| İngilizceleştirme (status board, etiketler, yorumlar)     | düşük-orta | Mekanik ama yaygın                                    |
| Temizlik (adlar, eşikler, drift: codex-starter "Phase 3") | düşük      | Lansman öncesi zorunlu                                |

## 9. Envanterin Yan Bulguları (repo'ya geri bildirim)

1. `codex-phase-4-starter.md` içeriği hâlâ "Phase 3 / Cycle Phase: 3" (PRD-248 renumber drift'i).
2. `_state/acceptances.json` şemasız (agent-lock + prd-state var, acceptances yok).
3. `ACCEPTANCE_OWNERS` içinde gerçek kullanıcı adı; `prd-defer-oldest.mjs` içinde gerçek ad hardcode.
4. `verify-wave-plan` autorun/workflow zincirinde değil, standalone — OSS'de manifest'e bağlanmalı.

## 10. Taşınabilir IP listesi (whitepaper/lansman omurgası)

9-değerli status yaşam döngüsü · PRD Class → skor+iskelet yönlendirmesi · Autonomous Close ·
Conflict Surface → lock `ownedPaths` → path-conflict gate'i · per-FR §11 makine-doğrulanabilir komutlar ·
Durable Artifacts gate'i · 6-boyut ağırlıklı readiness + binary verdict + hard caps · review metadata bloğu
(verdict/base-SHA/severity/quorum) · agent-lock lease modeli · prds.json kayıt şekli · deferral yenileme-cap
yönetişimi · union-merge append-only tekniği · stokastik-agent/deterministik-runner ayrımı · learning-before-merge
/ cleanup-after-verified-merge / never-push invariantları · "run, don't list" kanıt disiplini.
