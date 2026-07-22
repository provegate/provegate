# provegate-bootstrap — Yeni Repo Devir Paketi

Bu klasör, **ProveGate** open-source projesinin ayrı repository'de sıfırdan kurulumu için
kopyalamaya hazır devir paketidir (2026-07-22, Emofy Platform oturumlarından üretildi).

## Kullanım

1. Bu klasörü yeni repo'ya kopyala (öneri: `docs/research/` altına).
2. Boş dizinde taze bir agent oturumu aç.
3. `BOOTSTRAP_PROMPT.md` içeriğini yapıştır — agent iskeleti kurar.
4. Kurulum sonrası ilk gerçek iş: roadmap Faz B (config çekirdeği + state/lock çıkarımı).

## İçerik

| Dosya                                                  | Ne                                                                                                                                                                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BOOTSTRAP_PROMPT.md`                                  | Taze agent'a verilecek kurulum promptu (görev sırası + kısıtlar + bilinen tuzaklar)                                                                                                                                                             |
| `DECISIONS.md`                                         | Kilitli kararlar (isim, wordmark, tagline, monorepo, TS+tsup, MIT…) + PENDING maddeler                                                                                                                                                          |
| `whitepaper-gated-autonomy-2026-07-22.md`              | Tez dokümanı (draft v0.1, EN)                                                                                                                                                                                                                   |
| `competitor-landscape-agentic-workflows-2026-07-22.md` | Rakip matrisi + gap analizi (§2.5 shipgate/gatecheck addendum dahil)                                                                                                                                                                            |
| `de-emofy-inventory-2026-07-22.md`                     | Çıkarım envanteri (~11k LOC sınıflandırması, config boğazları, gate manifest dikişleri)                                                                                                                                                         |
| `oss-extraction-roadmap-2026-07-22.md`                 | Faz A–E program planı                                                                                                                                                                                                                           |
| `positioning-and-faq-2026-07-22.md`                    | Lansman kopyası kaynağı (one-liner'lar, SSS, do-not-say listesi)                                                                                                                                                                                |
| `source-snapshot/`                                     | **Emofy workflow kaynak anlık görüntüsü** — 39 script + 12 prompt + 6 şablon + 3 şema + 5 rule + 6 referans (commit `bf2e0a1a4`, PRD-418 sonrası). Faz B–D çıkarımı buradan yapılır; Emofy erişimi gerekmez. Bkz. `source-snapshot/MANIFEST.md` |

Not: Kaynak dokümanların kanonik kopyaları `_plans/research/` kökünde yaşamaya devam eder;
bu klasör devir anındaki donmuş kopyadır. Yeni repo'ya geçtikten sonra kanonik ev yeni repo olur.
