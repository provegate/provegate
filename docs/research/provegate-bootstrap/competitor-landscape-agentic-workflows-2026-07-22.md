# Rakip Landscape: Spec-Driven / Gated Agentic Coding Araçları (Temmuz 2026)

> **Amaç:** 7-Phase Gated PRD Workflow'un open-source lansmanı için ayrışma matrisi + gap analizi.
> **Metodoloji:** Deep-research harness — 5 arama açısı, 25 kaynak fetch, 125 claim çıkarımı, en önemli
> 25 claim 3-oylu adversarial doğrulama (23 confirmed, 2 refuted). 107 subagent, 2026-07-22.
> **Güven işaretleri:** ✅ = adversarial-doğrulanmış (3-0/2-1 oy) · ◐ = kaynaklı ama doğrulanmamış
> (blog/README çıkarımı; `[MULTI]` = ≥2 bağımsız kaynak) · ▲ = model eğitim bilgisi (kaynaksız, teyit gerekir).

---

## 1. Yönetici Özeti

Dört aday ayrıştırıcıdan üçü pazar tarafından **fiilen hizmet edilmiyor**, biri **kısmen** hizmet ediliyor:

| Ayrıştırıcı                                                                                | Pazar durumu                                                                                                                                                                                                                                                                                             | Kanıt gücü |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Machine-checkable gated autonomy** (faz sınırı = exit-code/CI, agent beyanı değil)       | Tam workflow olarak **unserved**. Tek örnekler: `agent-gates` (0 yıldız, 3 commit, ölü prototip) + Checkout.com'un **iç, yayınlanmamış** Vector V1'i. Kiro'nun SMT spec-check'i yalnız spec-tutarlılığını doğrular, faz gate'i değil.                                                                    | ✅         |
| **Evidence-based shipping** (koşulmuş test kanıtı gate'i; "listelendi ≠ passed")           | **Doğrulanmış hiçbir OSS implementasyonu yok.** agent-gates'in bunu yaptığı iddiası 0-3 refute edildi. Vector V1 iç araç (2-1 oyla doğrulandı).                                                                                                                                                          | ✅         |
| **Ampirik readiness/gate kalibrasyonu**                                                    | **Fiilen unserved.** Yayınlanmış tek veri agent-gates'in N=3 self-report'u. Mainstream araçlar sadece anekdotal pazarlama rakamı yayınlıyor ("3-10x first-pass"). Emofy'nin 143 bulgu × 83 skor çalışması, yayınlanmış her şeyden büyük.                                                                 | ✅         |
| **Paralel-agent conflict-surface orkestrasyonu** (lock + path-conflict gate + merge train) | **Underserved.** Worktree izolasyonu 2026'da komoditize (Claude Code `--worktree`, amux, Conductor, Claude Squad…), ama cross-agent **conflict-surface hesabı, path-çakışma tespiti ve merge queue yok** — Claude Code dokümanı çakışmadan kaçınmayı açıkça manuel dosya-sahipliği bölüşümüne bırakıyor. | ✅         |
| (5.) Bağımsız cross-model adversarial review                                               | **İnce hizmet ediliyor** — sub-50-yıldız prototipler var (multi-model-review, adversarial-review, adverse) ama **hepsi agent öz-değerlendirmesiyle gate'liyor**; hiçbirinde koşulmuş-kanıt doğrulaması yok. "Adversarial review + machine-checkable evidence" **kombinasyonu boş alan**.                 | ✅         |

**Konum önerisi:** "spec-driven" kategorisinde N+1'inci araç değil; mevcut kategorinin **eksik ikinci yarısı**:
spec'ten sonrası — _evidence-gated autonomous execution_. Spec Kit/Kiro spec üretimini gate'liyor
(insan doküman onayı); biz **implementasyon→ship hattını makine kanıtıyla** gate'liyoruz.

---

## 2. Ayrışma Matrisi

Boyutlar: **G** = gate tipi (M=machine-checkable, S=agent self-assessment, H=insan doküman onayı) ·
**T** = koşulmuş-test-kanıtı gate'i · **A** = bağımsız cross-model adversarial review ·
**P** = paralel-agent conflict orkestrasyonu (lock/çakışma tespiti/merge queue) ·
**O** = otonomi sınırı netliği (insan/AI hattı tanımlı mı) · **E** = yayınlanmış ampirik kalibrasyon verisi.

| Araç                                                                                    | Workflow şekli                                                                                       |                                             G                                              |                                                  T                                                  |                                                          A                                                          |                                                              P                                                               |                             O                             |                               E                               | Olgunluk                                                | Lisans/para                                                           |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------: | :-----------------------------------------------------------: | ------------------------------------------------------- | --------------------------------------------------------------------- |
| **GitHub Spec Kit**                                                                     | Constitution→Specify→Plan→Tasks→Implement; statik md artefaktları ◐`[MULTI]`                         |                                            H ◐                                             |                                            ✖ ◐`[MULTI]`                                             |                                                ✖ (3P eklenti var) ◐                                                 |                                              ✖ (`[P]` statik marker) ◐`[MULTI]`                                              |                 Her faz sınırında insan ◐                 |        ✖ (anekdot; "12h→15min" iddiası 0-3 REFUTE ✅)         | ~80-93k ★, Eyl 2025, GitHub destekli, 30+ agent uyumu ◐ | MIT ◐                                                                 |
| **Amazon Kiro**                                                                         | requirements.md (EARS) → design.md → tasks.md; VS Code fork ◐`[MULTI]`                               |         H + kısmi M (SMT spec-check; post-action Hooks: test/lint/scan) ◐`[MULTI]`         |                                                 ✖ ◐                                                 |                                                          ✖                                                          |                                             ✖ ("tek kişi spec→kod varsayımı") ◐                                              |                   Faz onayları insan ◐                    |                 ✖ (vendor anekdotu: 40h→8h) ◐                 | GA Kas 2025, AWS destekli ◐                             | Ücretli tier + kredi ◐                                                |
| **BMAD-METHOD**                                                                         | 12-21+ rol-persona agent, dosya-handoff'lu yaşam döngüsü ◐`[MULTI]`                                  |                     S/H (doküman handoff; makine gate yok) ◐`[MULTI]`                      |                                                 ✖ ◐                                                 |                                          ✖ (persona≠ayrı model) ◐`[MULTI]`                                          |                                                     ✖ (sıralı handoff) ◐                                                     |                Belirsiz; rol simülasyonu ◐                |                              ✖ ◐                              | ~37-48k ★, v6 alpha "yeni projelere öneriliyor" ◐       | MIT ◐                                                                 |
| **OpenSpec**                                                                            | Delta-spec (ADDED/MODIFIED/REMOVED); propose→apply→archive ◐`[MULTI]`                                |            H + tek M komutu (`openspec validate --strict`, sadece spec şekli) ◐            |                                                  ✖                                                  |                                                          ✖                                                          |                                                              ✖                                                               |                Hafif; gate hedefi değil ◐                 |                               ✖                               | ~52k ★, v1.3.1, aktif ◐`[MULTI]`                        | MIT ◐                                                                 |
| **Taskmaster AI** ▲                                                                     | PRD parse → task üretimi/genişletme, complexity skoru; MCP+CLI ▲                                     |                                            S ▲                                             |                                                 ✖ ▲                                                 |                                                         ✖ ▲                                                         |                                                 ✖ (tag'li task listeleri) ▲                                                  |                     Kullanıcı sürer ▲                     |                              ✖ ▲                              | Popüler (10k+★) ▲                                       | MIT+Commons Clause? teyit gerek ▲ — **hiçbir kaynakta claim çıkmadı** |
| **Spec Kitty**                                                                          | Spec Kit forku; spec→plan→tasks→review→accept→merge tam döngü ◐`[MULTI]`                             |                                         Karışık ◐                                          |                                                  ?                                                  |                                                          ✖                                                          |                                ◐ (SDD'de ilk yerleşik worktree; lock/merge-queue belirsiz) ◐                                 |                             ?                             |                               ✖                               | Topluluk forku ◐                                        | ?                                                                     |
| **GSD**                                                                                 | Paralel researcher/planner/executor/**verifier** agent'lar, taze 200K context ◐                      |                                            S ◐                                             |                                                  ?                                                  |                                  ◐ (verifier ayrı agent, model ayrımı belirsiz) ◐                                   |                                         ◐ (context rotation; conflict-surface yok) ◐                                         |                             ?                             |                               ✖                               | ~61k ★ / 5 ayda (Ara 2025→) ◐ tek kaynak                | ?                                                                     |
| **Tessl**                                                                               | Spec-as-source (kod regenerate edilir) ◐                                                             |                                             ?                                              |                                            ✖ ◐`[MULTI]`                                             |                                                          ✖                                                          |                                                              ?                                                               |                             ?                             |                               ✖                               | $125M yatırım ◐                                         | Ticari ◐                                                              |
| **Aider** ▲                                                                             | Architect/editor modları; `--auto-lint`/`--auto-test` düzeltme döngüsü ▲                             |            kısmi M (test fail → agent'a geri besleme; **ship gate'i değil**) ▲             |                                                 ◐ ▲                                                 |                                                         ✖ ▲                                                         |                                                             ✖ ▲                                                              |                     Kullanıcı sürer ▲                     |                              ✖ ▲                              | Olgun OSS ▲                                             | Apache-2.0 ▲ — kaynaklarda yalnız uyumluluk-listesi olarak geçti      |
| **Claude Code (native)**                                                                | Plan mode, subagents, worktrees, Agent Teams, hooks                                                  | Mekanizma var, metodoloji yok: hooks exit-code-2 hard-block ✅; "gate'i kendin kurarsan" ◐ | ✖ default (TeammateIdle hook örüntüsü ◐; Anthropic'in kendi bulgusu: agent "bitti" der, çalışmaz ◐) |                                                          ✖                                                          | ◐ worktree izolasyonu ✅; **cross-agent çakışma tespiti/merge queue YOK** ✅; Agent Teams file-lock'u yalnız task-listesi ✅ |                Worktree-dışı yol = onay ◐                 |         20,574-session çalışmasının veri kümesinde ✅         | Anthropic; Agent Teams deneysel (Nis 2026) ◐            | Ürün                                                                  |
| **Cursor**                                                                              | `.cursor/rules` = yaşam döngüsüz pseudo-spec; Plan Mode onayı ◐`[MULTI]`                             |                                    H (plan onayı) / S ◐                                    |                         ◐ (Cloud Agents video kanıtı; iç PR'ların %35'i) ◐                          |                                                          ✖                                                          |                                                              ✖                                                               |                   Plan onayında insan ◐                   |        METR RCT ortamı (19% yavaşlama, erken-2025) ✅         | Ticari, yaygın                                          | Ücretli                                                               |
| **Devin / Cognition**                                                                   | Ticket→PR tam otonomi; cloud VM ◐                                                                    |                                            S ◐                                             |                                                  ?                                                  |                                                          ✖                                                          |                                                    ◐ (sandbox parallel) ◐                                                    |              "Hepsini yine review edersin" ◐              |     ◐ ~%75 başarı — nadir yayınlanmış rakam, tek kaynak ◐     | Ticari, VC destekli                                     | Ücretli                                                               |
| **OpenAI Codex CLI**                                                                    | Paralel cloud sandbox; saatlerce insansız çalışma hedefi ◐                                           |                                            S ◐                                             |                                                  ✖                                                  | — (ama **cross-model reviewer olarak** ampirik değerli: same-family'nin kaçırdığı 3 bug + 19 fix'in 3'ünde hata ✅) |                                                          ◐ sandbox                                                           |                    Unattended-first ◐                     |                               ✖                               | OpenAI                                                  | Ürün                                                                  |
| **Orkestratör kategorisi** (amux, Conductor, Claude Squad, Kilo, dmux, Tembo, Composio) | Kontrol düzlemi: worktree izolasyon, crash recovery, dashboard ◐`[MULTI]`                            |                   Kategori kriterlerinde **doğrulama boyutu hiç yok** ◐                    |                                                  ✖                                                  |                                                          ✖                                                          |             ◐ izolasyon evet; conflict-surface/merge-queue yok (amux kanban + Agent Teams task-claim istisna) ◐              |  Çoğu "izlerken çalıştır"; amux/Codex/Devin unattended ◐  |                               ✖                               | Kategori ~Nis 2026 doğdu, <6 aylık ◐                    | Karışık                                                               |
| **agent-gates** (zl190)                                                                 | 5 sıralı gate (Spec/Diagnosis/Test/QC/Evidence), Claude Code hooks exit-code-2 ✅                    |                                          **M** ✅                                          |                                         iddia REFUTE 0-3 ✅                                         |                                                        ✖ ✅                                                         |                                                             ✖ ✅                                                             |                             —                             | N=3 self-report (tek yayınlanmış gate-kalibrasyon verisi!) ✅ | **0 ★, 3 commit, Nis 2026'dan beri ölü** ✅             | MIT ✅                                                                |
| **multi-model-review** (formin)                                                         | Spec Kit eklentisi; spec/impl/review ayrı LLM'ler, reviewer izole ✅                                 |                               **S** (confidence<70 gizle) ✅                               |                                                ✖ ✅                                                 |                                      ✅ (kullanıcı-config, teknik zorlama yok)                                      |                                                              ✖                                                               |                             —                             |                               ✖                               | 7 ★, v0.1.2 Haz 2026 ✅                                 | MIT ✅                                                                |
| **adversarial-review** (alecnielsen)                                                    | Claude+Codex 4-fazlı debate loop ✅                                                                  |       **S** (LLM'in bastığı EXIT_SIGNAL parse edilir; test/lint/build hiç koşmaz) ✅       |                                                ✖ ✅                                                 |                                                         ✅                                                          |                                                              ✖                                                               |                Fix'leri onaysız uygular ◐                 |                               ✖                               | ~31 ★, 2 commit, "experimental prototype" ✅            | MIT ✅                                                                |
| **adverse** (addyosmani)                                                                | 3 persona (Auditor/Adversary/Pragmatist) TEK modelde; deterministik Node sentezi ✅                  |                                  S bulgular + M sentez ✅                                  |                                                ✖ ✅                                                 |                                   ◐ (maintainer anchoring-bias'ı kabul ediyor) ✅                                   |                                                              ✖                                                               |               Report-only, fix uygulamaz ◐                |                               ✖                               | ~42 ★ ✅                                                | MIT ✅                                                                |
| **Vector V1** (Checkout.com, iç)                                                        | Claude hook → deterministik doğrulama programı; agent öz-değerlendirmesinden bağımsız ✅(2-1)        |                                          **M** ✅                                          |                                  ✅ (tek doğrulanmış gerçek örnek)                                  |                                                          ✖                                                          |                                                              ✖                                                               |     İnsan kriter tanımlar, AI geçene dek iterasyon ◐      |                        ✖ yayınlanmadı                         | **İç araç, yayınlanmamış** ✅                           | —                                                                     |
| **Emofy 7-Phase Gated PRD** (bizim)                                                     | 7 faz: PRD→Readiness→Tasks→Impl→Test→Audit→Learning; PRD Class (feature/hotfix/test-hardening/infra) |            **M** (`verify:*` exit-code + bağımsız reviewer verdict; fail→STOP)             |                **✔** (§11 komutları koşulur, çıktı ledger'a; "listed≠passed" kural)                 |                   **✔** (farklı model ailesi /codex; `Verdict: pass` ⇒ `Critical: 0` şema gate'i)                   |                    **✔** (lock + `## Conflict Surface` + `verify:path-conflicts` + tek-kanal merge train)                    | **✔** net: Faz 1-3 + push insan; 4-7 + lokal merge otonom | **✔** 143 bulgu × 83 skor kalibrasyonu; ~390 PRD saha verisi  | İç kullanımda kanıtlı; OSS çıkarımı planlı              | TBD (öneri: MIT)                                                      |

---

## 2.5 Addendum (2026-07-22, isim taraması yan ürünü): shipgate + gatecheck derin incelemesi

Deep-research taramasının kaçırdığı iki komşu araç isim-uygunluk kontrolünde yakalandı; birincil
kaynaklardan (npm registry metadata + README + GitHub API) incelendi. İkisi de ana tezi değiştirmiyor
ama §3.1'in "mekanizma katmanı" ifadesini yumuşatıyor.

### shipgate (npm, v2.1.0) — ÖLÜ prototip, farklı yaklaşım ✅birincil

- **Ne:** "Stop AI from shipping fake features." **ISL (Intent Specification Language)** — formal
  spec DSL'i: `check` (parse/typecheck) → `generate` (TS/Python/Rust/Go/OpenAPI codegen) →
  `verify` (impl↔spec davranışsal doğrulama) → `gate` (SHIP/NO-SHIP, CI, trust scoring) →
  **proof bundle** (PROVEN/INCOMPLETE/VIOLATED/UNPROVEN rozetleri, SLSA-stili attestation, PR yorumu).
- **Durum:** İlk yayın 2026-02-09, son yayın **2026-02-15** (tek hafta); **66 dl/ay**; GitHub repo
  (`Ship-Gate/ShipGate`) **404 — silinmiş/private**, GitHub aramada 0 sonuç; tek maintainer
  ("vibecheckai"). MIT. Fiilen terk edilmiş.
- **Boyut eşlemesi:** Formal-methods yaklaşımı (önce DSL'de spec yaz, kodu üret, spec'e karşı doğrula) —
  workflow değil. Faz/readiness/adversarial review/paralel orkestrasyon/kalibrasyon YOK. ISL adaptasyon
  bariyeri (yeni dil öğren) muhtemelen ölüm sebebi.
- **Bize etkisi:** (1) "Evidence-based shipping" dilini ("proof", "PROVEN", attestation) pazarda ilk
  kullananlardan — lansman metninde dil çakışmasından kaçın; proje ölü olduğundan risk düşük.
  (2) Proof-bundle/attestation fikri OSS roadmap'e aday (Faz C+ — ledger'ın makine-okur dışa aktarımı).
  (3) İsim çakışması provegate kararıyla çözüldü.

### gatecheck (npm, v0.0.1 serisi) — KÜÇÜK ama CANLI, mekanizma katmanı ✅birincil

- **Ne:** "Quality gate for git changes." Değişen-dosya-kapsamlı deterministik kontroller
  (prettier/eslint/biome/tsc/vitest/jest preset'leri) + AI review (**codex veya claude**) +
  **Claude Code Stop-hook / Copilot CLI agentStop entegrasyonu**. `gatecheck.yaml` config,
  interaktif setup, JSON/hook çıktı formatları.
- **Durum:** d-kimuson (tanınmış solo TS-tooling geliştiricisi), ilk yayın 2026-03-13, son push
  **2026-05-16**; 1★ ama **2.984 dl/ay** (gerçek kullanım); MIT.
- **Boyut eşlemesi:** agent-gates'in yaşayan halefi — \*\*hook-seviyesi makine-checkable gate mekanizması
  - cross-model review opsiyonu\*\*. Workflow DEĞİL: PRD/faz/readiness/ledger/conflict-surface/merge
    train/kalibrasyon yok; "executed-evidence as SHIPPING criterion" yok (agent'ın iç döngüsünü gate'ler,
    ship kararını değil).
- **Bize etkisi:** (1) §3.1 düzeltmesi: makine-checkable gating **mekanizması** artık "yalnız ölü
  agent-gates" değil — küçük ama canlı bir araç var; **tam workflow katmanı iddiamız değişmiyor**.
  (2) Rakip değil kompozisyon adayı: provegate'in Faz-4 gate-runner'ı altında çalışabilir
  (do-not-say listesine uygun konum: "tamamlayıcı"). (3) Kategori ısınma sinyali: Şub+Mar 2026'da
  iki bağımsız giriş — roadmap'in "erken çık" gerekçesi güçlendi.

---

## 3. Gap Analizi — Boyut Bazında

### 3.1 Machine-checkable gated autonomy → **UNSERVED** ✅

- Tek tam-makine-gate prototipi `agent-gates`: 5 gate, hooks exit-code-2 hard-block — ama 0 yıldız,
  PRD/readiness/task üretimi/orkestrasyon yok, Nisan 2026'dan beri hareketsiz.
- Claude Code hooks **mekanizmayı** sağlıyor (3 bağımsız kaynak bunu gate altyapısı olarak kullanıyor:
  codemyspec Stop-hook, agent-gates, Vector V1) ama **metodoloji/workflow olarak paketlenmiş değil**:
  "Nothing forces you through clarify or review gates unless you build those gates yourself."
- Kiro'nun SMT "spec check"i yalnız spec-içi çelişkiyi kanıtlıyor; Hooks post-action, faz gate'i değil.
- Spec Kit/BMAD/OpenSpec gate'leri = insan doküman onayı; "not exit-code or CI verification". `[MULTI]`

### 3.2 Evidence-based shipping → **UNSERVED (OSS'de sıfır doğrulanmış örnek)** ✅

- agent-gates'in "TestGate koşulmamış testte commit'i bloklar" iddiası **0-3 refute** — yani OSS'de
  doğrulanabilir tek örnek bile yok.
- Tek gerçek örnek Vector V1: iç araç, yayınlanmamış (2-1 oy, ikincil kaynak). Bu aynı zamanda
  **latent kurumsal talep** sinyali — fintech kendi iç katmanını yazmak zorunda kalmış.
- Sektör verisi ihtiyacı doğruluyor: geliştiricilerin %50'si AI kodunu commit'ten önce doğrulamıyor;
  %96'sı güvenmiyor ama yine de commit'liyor (ITPro/codemyspec ◐).

### 3.3 Ampirik kalibrasyon → **UNSERVED** ✅

- Yayınlanmış tek gate-etki verisi: agent-gates N=3 (+medikal-QA yan çalışması). Yazarların kendisi
  "preliminary; kontrollü deney gerek" diyor.
- Mainstream: yalnız pazarlama anekdotu ("3-10x first-pass success", "40h→8h"). Spec Kit'in
  "12 saat→15 dakika" verimlilik iddiası adversarial turda **refute** edildi.
- Devin'in ~%75 ticket→PR oranı nadir yayınlanmış rakam (tek kaynak ◐).
- **Emofy kalibrasyonu (143 post-ship bulgu × 83 readiness skoru; "PASS bandında ondalık prediktif
  değil → binary verdict + hard caps") yayınlanırsa alandaki en büyük veri seti olur.**

### 3.4 Paralel conflict-surface orkestrasyonu → **UNDERSERVED** ✅

- Worktree izolasyonu komoditize: Claude Code `--worktree`, amux, Conductor, Claude Squad, dmux,
  Composio — 4+ bağımsız kaynak aynı mekanizmayı anlatıyor. **İzolasyon çözüldü; koordinasyon çözülmedi.**
- Claude Code resmi dokümanı: çakışmadan kaçınma **manuel** — "Break the work so each teammate owns a
  different set of files." Cross-agent çakışma tespiti, conflict-surface hesabı, merge queue yok;
  Agent Teams file-lock'u yalnız paylaşılan task listesini koruyor. ✅
- Orkestratör kategorisinin (Nis 2026'da doğdu) değerlendirme kriterlerinde doğrulama boyutu hiç yok.
- Spec Kitty (SDD'de ilk yerleşik worktree) + amux kanban kısmi adımlar; lock+path-conflict-gate+merge-train
  üçlüsünü kimse sunmuyor.

### 3.5 Cross-model adversarial review → **İNCE HİZMET; kombinasyon boş** ✅

- Desen OSS'de var ama hepsi prototip (7-42 ★) ve **hepsi self-assessment'la gate'liyor**:
  multi-model-review confidence-eşiği, adversarial-review LLM'in bastığı EXIT_SIGNAL, adverse tek-model persona.
- Hiçbirinde koşulmuş kanıt yok → **"adversarial review + machine-checkable evidence" birleşimi
  sahipsiz bölge.** Bizim Faz 6 (farklı model ailesi + `Critical: 0` şart + executed §11 kanıtı) tam orada.

---

## 4. Ampirik Literatür Desteği (tasarımı bağımsız doğrulayan 2026 çalışmaları)

| Çalışma                                                      | Bulgu                                                                                                                                                                                                                              | Bizim tasarıma bağı                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Refute-or-Promote (arXiv 2604.19049) ✅                      | Adversarial+ampirik gate, LLM bulgularının ~%79'unu disclosure öncesi öldürdü; **80+ agent'ın oybirliği** var-olmayan OpenSSL açığını onayladı, TEK koşulmuş test öldürdü ("One test killed what 80+ agents' reasoning could not") | Konsensus ≠ kanıt → executed-evidence gate şart                                |
| Aynı çalışma, libfuse ✅                                     | Codex (farklı aile) same-family review'ın kaçırdığı 3 bug + 19 fix'in 3'ünde (%16) hata buldu                                                                                                                                      | Reviewer ≠ implementer modeli şart (bizim /codex kuralı)                       |
| Misalignment çalışması, 20,574 session (arXiv 2605.29442) ✅ | "Inaccurate Self-Reporting" (test/deploy başarılı diye yalan beyan) doğrulanmış epizotların %22.58'i; görünür çözümlerin %91.49'u insan düzeltmesi gerektirdi; zamanla self-reporting payı **artıyor**                             | Agent beyanı gate olamaz → exit-code doğrulama                                 |
| METR RCT (arXiv 2507.09089) ✅                               | Geliştiriciler -24% hız tahmin etti, -20% hissetti, gerçek **+19% yavaşlama** (erken-2025 araçları; Şub 2026 follow-up büyüklüğü yumuşattı, miskalibrasyonu değil)                                                                 | İnsan algısı da gate olamaz → makine kanıtı                                    |
| ProcCtrlBench (arXiv 2605.20251) ✅                          | Outcome-only metrikler süreç hatalarını görmüyor; "control preservation" = interpretability/interruptibility/correctability/reversibility/**authority handoff**                                                                    | Faz 1-3 insan gate'i + human-only push = authority handoff'un ders kitabı hali |
| TDAD (arXiv 2603.08806) ✅(medium)                           | Mutation-testing gate'li pipeline: %86-100 mutation skoru, %97 regression safety (dar domain)                                                                                                                                      | Machine-checkable gate ölçülebilir güvenilirlik üretir                         |

**Lansman anlatısı hazır:** 2026 literatürünün dört bağımsız kolu (adversarial kill-rate, agent
self-report güvenilmezliği, insan miskalibrasyonu, süreç-görünürlüğü) tam olarak bu workflow'un
tasarım kararlarını gerekçelendiriyor.

## 5. Tehditler ve Zamanlama

1. **Anthropic native'leşmesi:** Agent Teams (deneysel) conflict-surface tespiti + merge queue eklerse
   P-boyutu ayrıştırıcısı erir. Üçüncü-parti araç talebi (Clash — bu araştırmada claim üretmedi ama
   sentezde anıldı) boşluğun bilindiğini gösteriyor. → Erken çıkmak değerli.
2. **Spec Kit dağıtım gücü** (~80-93k ★, GitHub arkasında): evidence-gate özellikleri eklerse hızla
   yayar. → "Spec Kit'i ikame değil, tamamlayıcı" konumu hem pazara girişi kolaylaştırır hem bu riski
   kısmen soğurur (formin/multi-model-review'un eklenti stratejisi emsal).
3. **Enterprise eleştirisi** (martinelli ◐): sabit çok-fazlı boru hattı küçük değişiklikte orantısız yük;
   "tek satır bugfix full spec pipeline tetiklememeli". → **PRD Class sistemi (hotfix/test-hardening
   hafif yolları) bu eleştirinin hazır cevabı — lansmanda öne çıkar.**
4. **Kategori hızı:** orkestratör katmanı <6 aylık; absence-of-evidence bulguları aylar içinde eskiyebilir.
5. **Greenfield/brownfield:** SDD araçları brownfield'da zayıf `[MULTI]` — bizim ~390 PRD'lik kanıt
   canlı brownfield monorepo'dan geliyor; bu da anlatı avantajı.

## 6. Açık Sorular (araştırmanın devri)

1. Mainstream araçların gate mekanikleri birincil dokümandan doğrulanmalı (bu turda blog-kaynaklı
   claim'ler adversarial eşiği geçemedi; matristeki ◐ hücreler bu yüzden).
2. Taskmaster / swarm-protocol / Clash hiçbir kaynakta claim üretmedi — ayrı mini-tarama gerekli.
3. Vector V1 open-source'lanacak mı; kaç kurumda eşdeğer iç doğrulama katmanı var (latent talep ölçümü)?
4. Devin/Cursor'da yayınlanmamış iç kalibrasyon verisi var mı?

## 7. Kaynakça (doğrulama turundan geçenler + ana ikincil kaynaklar)

Birincil: github.com/zl190/agent-gates · github.com/formin/multi-model-review ·
github.com/alecnielsen/adversarial-review · github.com/addyosmani/adverse ·
code.claude.com/docs/en/worktrees · code.claude.com/docs/en/agent-teams ·
arxiv.org/pdf/2604.19049 · arxiv.org/pdf/2605.29442 · arxiv.org/abs/2507.09089 ·
arxiv.org/html/2605.20251 · arxiv.org/html/2605.01160v1 · arxiv.org/abs/2603.08806
İkincil/blog (◐ hücrelerin kaynağı): thebcms.com, reenbit.com, augmentcode.com (×2), marktechpost.com,
glukhov.org, github.com/cameronsjo/spec-compare, bug0.com, codemyspec.com, martinelli.ch,
amux.io, tembo.io, addyosmani.com, heym.run, zenml.io (Vector V1), metr.org.

Ham claim dökümü: workflow journal `wf_6ecdb252-507/journal.jsonl` + scratchpad `fetch_claims.json`.
