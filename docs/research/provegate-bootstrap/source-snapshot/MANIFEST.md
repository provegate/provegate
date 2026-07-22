# source-snapshot — Emofy Workflow Kaynak Anlık Görüntüsü

> Alındığı commit: `bf2e0a1a4` (local development, 2026-07-22 — **PRD-418 hijyen temizliği SONRASI**:
> acceptances şeması + verify:acceptances + owner-allowlist SSOT + codex-starter renumber dahil).
> Faz B–D çıkarımının kaynak malzemesi BU klasördür — yeni repo'daki agent'ın Emofy repo'suna
> erişmesi gerekmez. Sınıflandırma haritası: `../de-emofy-inventory-2026-07-22.md` (G/P/D/IG).

## İçerik

### scripts/ — makine katmanı (39 dosya; envanter Katman 1)

37 workflow script'i (`prd-autorun`, `prd-worktree`, tüm `verify-*` makine gate'leri, `state`/`sync`
ailesi, `ship-pre`, `wip-commit`, `guard-base-branch-commit`, yeni `verify-acceptances`) +
`lib/` (base-branch-policy, acceptance-owners loader) + `allowlists/acceptance-owners.json` +
`.gates-wired-exceptions.json`.

- **Config boğazları:** `prd-state-utils.mjs` (~60 import'un merkezi) + `lib/base-branch-policy.mjs`
  → OSS `workflow.config` yüzeyi bu ikisinin parametreleridir (envanter §1).
- **Gate manifest dikişi:** `verify-workflow.mjs` `checks[]` + `prd-class-gates.mjs` listeleri.
- Emofy'nin ~55 domain gate'i (authz/convex/ema/rds…) BİLEREK dahil değil — OSS'de kullanıcı
  plugin'i; galeri örnekleri Faz D'de bu desenlerden genericleştirilir.

### prompts/ — 12 faz/metot promptu (envanter Katman 2)

phase-1…7 + orchestration-runner + wiki-ingest/lint + iki araç adaptörü (Cursor bootstrap,
Codex starter). Taşınabilirlik sıralaması ve Emofy-kuplaj listeleri envanterde; en temiz:
phase-5 (%80), orchestration-runner (%75), phase-2 (%70).

### templates/ — 6 artifact şablonu (adlar genericleştirildi: `prd-template.md` vb.)

prd / readiness / tasks / summary / review / doc. En temiz çıkarım birimi: review-template
(metadata bloğu) + tasks-template (Verification Ledger + Operator Handoff).

### schemas/ — 3 JSON şeması

agent-lock, prd-state, acceptances (PRD-418 ile yeni). OSS'de 4.: review-metadata (Faz B'de yazılır).

### rules/ — 5 Cursor kuralı (`prd-*.mdc`)

Shape generic, içerik Emofy — adapter katmanına referans.

### reference/ — 6 bağlam dosyası

`WORKFLOW.md` (metot spec'inin ~%60 generic kaynağı → paketin METHOD.md'si buradan),
`AGENT_BOOTSTRAP.md` (agent giriş deseni), `prd-land.md` (kapanış komutu; never-push kuralı),
`commitlint.config.js` + `.gitattributes` (union-merge append-only tekniği),
`status-board-example.md` (\_STATUS.md — board yapı örneği; içerik Emofy'ye özel, YAPIYI al),
`package-scripts-map.json` (npm script → dosya haritası, filtrelenmiş).

## Kullanım kuralları (yeni repo agent'ı için)

1. Bu kod OLDUĞU GİBİ ÇALIŞTIRILMAK için değil, ÇIKARIM için: TypeScript'e port edilirken
   envanterdeki sınıflara göre davran — G: aynen taşı, P: Emofy değerlerini config'e çek,
   embedded-D: plugin API'sine dönüştür.
2. Emofy'ye özgü değerler (dizin adları, branch adları, Türkçe etiketler, `@emofy/*`, pnpm komut
   adları, PRD-numara eşikleri) ASLA hardcode taşınmaz — `workflow.config` alanı olur.
3. Kişi adları (`rayvaz` allowlist değeri, örnek dosyalardaki adlar) OSS koduna/örneklerine girmez.
4. Türkçe içerik EN'e çevrilir (paket %100 EN — DECISIONS).
5. Bu snapshot donmuş kopyadır; Emofy tarafı ilerlerse senkron sorumluluğu yoktur — çıkarım
   bu sürümden yapılır.
