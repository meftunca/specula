# Context-Tabanlı UI / Unit / Otomasyon Test Sistemi
Bu repo, React / Svelte / Vue / plain HTML tabanlı projeler için **context-based** (form bağımsız) otomatik test üretim sisteminin detaylı tasarımını içerir.

Sistem üç ana katmandan oluşur:

1. **UI / Component Testleri**
2. **Unit Testleri** (özellikle component/logic odaklı)
3. **Otomasyon (E2E) Testleri**

Ana fikir:

- UI kodunun içinde **minimal direktifler** (data-* attribute’ları ve yorum (comment) macro’ları) kullanarak,
- Kaynak koddan bir **IR (Intermediate Representation)** üretmek,
- Sonra bu IR’den farklı test türleri (unit, UI, E2E) için **test dosyaları generate** etmektir.

---

## Dosya Listesi

- `01-system-overview.md` — Yüksek seviye mimari ve akış
- `02-dsl-spec.md` — Attribute ve comment tabanlı DSL tanımı
- `03-ir-spec.md` — IR (Intermediate Representation) şeması
- `04-generators-spec.md` — IR → Jest / Vitest / Cypress / Playwright mapping’leri
- `05-cli-tool-spec.md` — CLI aracı ve konfigürasyon formatı
- `06-implementation-plan.md` — Uygulama aşamaları, teknolojiler ve roadmap

Bu dokümanlar, sistemin ilk PoC’inden production seviyesine kadar ilerleyebileceğin detayda hazırlanmıştır.
