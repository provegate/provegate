# OSS Çıkarım Yol Haritası — Gated Autonomy Workflow

> **Amaç:** Whitepaper + rakip analizi + de-Emofy envanterini uygulanabilir fazlı plana çevirmek.
> **Girdiler:** `whitepaper-gated-autonomy-2026-07-22.md`, `competitor-landscape-agentic-workflows-2026-07-22.md`,
> `de-emofy-inventory-2026-07-22.md`. İç doküman. 2026-07-22.

---

## 0. İlkeler

1. **Dogfood şartı:** Her milestone sonunda Emofy, iç scriptlerin o dilimini OSS paketiyle değiştirir.
   OSS'in en güçlü kanıtı "biz bununla geliştiriyoruz" — ve tek gerçek regresyon testi bizim repo.
2. **Whitepaper önce, kod sonra:** Tez ucuz doğrulanır; CLI pahalı. Geri bildirim toplamadan API dondurma.
3. **Her milestone kendi workflow'umuzdan geçer** (infra-class PRD) — meta-hikaye lansman anlatısının parçası.
4. **Kapsam disiplini:** ~55 domain gate ASLA pakete girmez; 2-3 genericleştirilmiş örnek galeri yeter.

## 1. Fazlar

> **Durum, 2026-07-27:** Faz A-E **tamamlandı** ve PRD-001..016 ile hayata geçti; aşağıdaki
> işaretlenmemiş kutular o çıkarım sırasında güncellenmedi ve **tarihsel plan olarak
> okunmalıdır, kalan iş listesi olarak değil.** Neyin gerçekten kaldığını `STATUS.md` ve
> `gate queue` söyler — bu dosya değil. Kutu kutu güncellemek yerine bu tek cümle
> konuldu: bir planı canlı bir izleyiciye dönüştürmek, iki tane izleyici yaratır ve
> ikisi de yanlış olur.

### Faz A — Tez + isim + iskelet (hazırlık)

- [ ] Whitepaper'ı gözden geçir → v1.0 (bu repo'daki draft v0.1).
- [x] İsim kararı: **provegate** (owner kararı 2026-07-22). npm ✓ boş, GitHub org ✓ boş
      (tarama aynı gün; tez adı "Gated Autonomy" whitepaper'da kalır). KALAN: `.dev`/`.io` domain
      whois + npm placeholder publish + GitHub org rezervasyonu (owner işi).
      Tarama yan ürünü: shipgate (ölü ISL-DSL prototipi) + gatecheck (canlı hook-gate, 3k dl/ay)
      derin incelendi → landscape §2.5 addendum.
- [ ] Lisans: MIT (whitepaper commitment'ı). Telemetri yok, push kodu yok — README'de açık taahhüt.
- [ ] Repo iskeleti: `core/ gates.manifest prompts/ templates/ schemas/ examples/` (envanter §7).
- [x] Repo hijyen ön-temizliği — **PRD-418 LANDED 2026-07-22** (readiness 9.2 PASS; codex review
      Verdict: pass, Critical: 0; lokal development'a merge, push bekliyor): codex-starter drift'i,
      `acceptances.schema.json` + `verify:acceptances` gate'i, owner-allowlist SSOT
      (`scripts/allowlists/acceptance-owners.json`), author git-config türetimi.
      NOT: `verify:wave-plan` zinciri kapsam DIŞI çıktı — PRD-392'nin kayıtlı bilinçli kararı
      (`.gates-wired-exceptions.json`); envanter §9/4 bulgusu Emofy için geçersiz.

### Faz B — Config çekirdeği + state/lock (ilk kaldıraç)

Envanterin boğaz noktası: `prd-state-utils.mjs` (524 LOC, ~60 import) + `base-branch-policy.mjs` (44 LOC).

- [ ] `workflow.config` yüzeyi: dirs (artifact ağacı), statusVocab, branches, commands, idPattern,
      owners, worktree modeli, SHARED_APPEND_ONLY.
- [ ] `core/state`: prds.json eşdeğeri SSOT + sync + query (queue/active/next). Şemalar: lifecycle,
      lock, **acceptances (yeni yazılacak — Emofy'de hiç yoktu)**, review-metadata.
- [ ] `core/locks`: lease modeli + sıfır-bağımlılık glob motoru + path-conflict gate.
      (`verify-agent-locks` GENERIC — olduğu gibi taşınır.)
- [ ] Dogfood: Emofy `state:*` + `prd:locks` + `verify:agent-locks/path-conflicts` OSS'ten çalışır.

### Faz C — Gate manifest + runner (ürünün kalbi)

- [ ] `gates.manifest` tasarımı: per-phase komut listeleri, class-default kuralları
      (diff-eşleşme koşullu), hard-cap plugin API'si (verify-prd-ready'nin MT&S/Contract cap'lerinin
      genericleştirilmesi: kullanıcı "route dokunursa deny-test şart" tipi kural tanımlar).
- [ ] `core/run`: prd-autorun motoru — Faz 4-7 gate zinciri, §11 parse + komut-güvenlik allowlist'i,
      review-artifact şema kontrolü, operator-acceptance guard, no-ff lokal merge + post-merge
      doğrulama + auto-revert. **Push kodu yolu YOK — mimari değişmez.**
- [ ] `verify-gates-wired` genericleştir (her manifest gate'i bir zincire bağlı olmalı — kendi kendini
      denetleyen manifest).
- [ ] Dogfood: bir Emofy PRD'si uçtan uca OSS runner'la kapanır.

### Faz D — Promptlar + şablonlar (metot paketi)

- [ ] 10 çekirdek metot promptu placeholder'lı: önce en taşınabilirler (phase-5 %80,
      orchestration-runner %75, phase-2 %70, phase-7 %70), sonra örnek-blok değişimi isteyenler
      (phase-1/3/4/6). Cursor/Codex adaptörleri `prompts/adapters/`e (bootstrap yeniden yazım).
- [ ] Şablonlar EN: review (en temiz) → tasks → readiness (checklist bloğu swap) → PRD (§8/§11/§12
      swap) → summary → status board (Türkçe başlıklar EN'e).
- [ ] `examples/`: 2-3 genericleştirilmiş domain gate (örn. route-guard coverage, doc-drift).
- [ ] Method spec dokümanı: WORKFLOW.md'nin generic ~%60'ı → paketin `METHOD.md`'si.

### Faz E — Lansman

- [ ] Case study: 390 PRD + kalibrasyon çalışması + panel bulgu sayıları (whitepaper §4'ün uzun hali).
- [ ] README (positioning-faq dokümanından beslenir) + quickstart (`init` → örnek PRD → ilk gated kapanış).
- [ ] Whitepaper yayını + duyuru içerikleri. Meta-hikaye: "bu araç kendi 7-fazlı süreciyle geliştirildi,
      işte PRD'leri."
- [ ] Rakip-landscape'in ◐ hücreleri lansman metnine girmeden birincil-doküman teyidi
      (açık soru #1: Spec Kit/Kiro/BMAD gate mekanikleri; Taskmaster/Clash mini-taraması).

## 2. Milestone → Envanter eşlemesi

| Milestone | Envanter kaynağı                                                                  | Taşınan hacim  |
| --------- | --------------------------------------------------------------------------------- | -------------- |
| B         | G-dosyalar (380 LOC) + state/lock P-dilimi                                        | ~1.500 LOC     |
| C         | autorun + class-gates + command-safety + review-utils + gates-wired               | ~1.300 LOC     |
| D         | promptlar (~868 generic LOC + örnek-blok yazımı) + şablonlar (~1.000) + METHOD.md | ~2.500 eşdeğer |
| E         | doküman/anlatı                                                                    | —              |

## 3. Riskler ve karşılıklar

| Risk                                                                | Karşılık                                                                                                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anthropic native conflict-orkestrasyon eklerse P-ayrıştırıcısı erir | Erken çık (Faz B-C hızlı); lock katmanını platform-agnostik tut — worktree yöneticilerinin ÜSTÜNDE çalışır                                           |
| Spec Kit dağıtım gücüyle evidence-gate soğurur                      | "Tamamlayıcı, ikame değil" konumu; Spec Kit artifact'larını girdi kabul eden adapter değerlendir                                                     |
| "Süreç ağır" algısı adoption öldürür                                | PRD Class ön planda; quickstart hotfix-class ile açılır (en hafif yol ilk izlenim)                                                                   |
| Bakım yükü tek kişiye biner                                         | Kapsam disiplini (§0.4); manifest = kullanıcı gate'leri bizim sorumluluğumuz değil                                                                   |
| İç workflow OSS'ten ayrışır (fork drift)                            | Dogfood şartı (§0.1) — Emofy her milestone'da tüketici                                                                                               |
| Kalibrasyon verisi tek-proje diye eleştirilir                       | Whitepaper §6 zaten kabul ediyor; topluluk verisi toplama tasarımı (opt-in, telemetrisiz — kullanıcı kendi metrics.jsonl'ını paylaşır) Faz E sonrası |

## 4. Açık kararlar (owner: rayvaz)

1. İsim + marka.
2. Dil politikası: paket %100 EN — Emofy içindeki Türkçe yüzeyler (\_STATUS.md başlıkları) dogfood
   sırasında EN'e mi geçer, config'te i18n etiketi mi olur? (Öneri: config'te `labels` — Emofy Türkçe kalır.)
3. Hedef runtime: Node tek başına mı (mevcut sıfır-bağımlılık çizgisi), yoksa Bun/Deno testi de mi?
4. Monorepo varsayımı: pnpm/turbo kuplajı config'e çekiliyor ama ilk sürüm tek-paket repo'yu
   destekleyecek mi? (Öneri: evet — `commands` config'i zaten araç-agnostik.)
