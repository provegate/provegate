---
description: PRD kapanışı — gate'ler yeşilse feat worktree'yi arşivle, lokal development'e merge et, worktree/lock/_STATUS temizle. ASLA push etmez.
argument-hint: "[PRD-XXX] (boş bırakılırsa mevcut feat worktree'den algılanır)"
---

# /prd-land — PRD kapanış + lokal development merge

Bu komut **tek deterministik eylemdir**: Faz 4-7 gate'lerini geçmiş bir PRD'yi
feat worktree'sinden lokal `development`'e indirir ve temizler. **Asla push etmez** —
push her zaman insanın kararıdır.

Tek kanonik komut: `pnpm prd:autorun -- --from-phase=merge PRD-XXX`. Bu adımı
serbest cümleyle yorumlama; aşağıdaki akışı birebir uygula.

## Adımlar

1. **PRD numarasını belirle.** Argüman (`$ARGUMENTS`) verildiyse onu kullan
   (`PRD-XXX` formatında olmalı). Verilmediyse mevcut branch'tan algıla:
   `git branch --show-current` → `feat/prd-XXX-<slug>`. Bir base branch'taysan
   (`development` / `staging` / `main`) **DUR** ve kullanıcıya söyle — bu komut
   feat worktree'sinden çalışmalı.

2. **Önce dry-run** ile planı göster (hiçbir şey merge/push etmez):

   ```sh
   pnpm prd:autorun -- --dry-run --from-phase=merge PRD-XXX
   ```

   Çıktıyı kullanıcıya aktar. Operator-gated uyarısı, gate hatası ya da
   "no state record" varsa **DUR** (state kaydı yoksa önce `pnpm state:sync`).

3. **Gerçek kapanışı çalıştır:**

   ```sh
   pnpm prd:autorun -- --from-phase=merge PRD-XXX
   ```

   Sırayla: wip→completed arşivle (feat'te commit) → feat'i lokal `development`'e
   `--no-ff` merge et → post-merge `check-types` + `build` → `pnpm prd:stop --force`
   (worktree + lock + `_STATUS.md` satırı temizliği) → handoff kartı bas.

4. **DUR.** Handoff kartını kullanıcıya olduğu gibi aktar.

## Kesin kurallar (ihlal etme)

- **`git push` ÇALIŞTIRMA, remote PR AÇMA.** Runner asla push etmez; push insan kararı.
- **Manuel `git merge` / `git checkout development` / elle worktree silme YAPMA.**
  Yalnızca yukarıdaki `prd:autorun` komutu. Merge başarısız olursa runner geri alır
  ve worktree'yi korur — sen müdahale etme.
- Bu komut yalnızca **kapanış** içindir (Faz 4-7 zaten yeşil). Implement/test/audit
  henüz bitmediyse bu komutu kullanma; normal gated akış devam etsin.
