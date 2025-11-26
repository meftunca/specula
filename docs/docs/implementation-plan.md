---
id: implementation-plan
title: Uygulama Planı ve Yol Haritası
sidebar_label: Uygulama Planı
sidebar_position: 6
description: TestWeaver implementasyon fazları ve teknoloji yığını
---


Bu doküman, sistemin nasıl gerçeğe dönüştürüleceğini adım adım anlatan bir **uygulama planı** sunar.

---

## 6.1. Teknoloji Stack Önerisi

- Dil: **TypeScript**
- Runtime: **Node.js**
- AST / Parsing:
  - React/JSX/TSX: `@babel/parser`, `@babel/traverse`
  - Vue: `@vue/compiler-sfc`
  - Svelte: `svelte/compiler`
  - HTML: `parse5`
- CLI: `commander` veya `yargs`
- File watching: `chokidar`
- Config: `cosmiconfig` veya custom loader
- IR saklama: düz JSON dosyası (`.testgen/ir.json`)

---

## 6.2. Fazlar (Phases)

### Faz 0 — PoC Scope Tanımı

- Framework: **React (TSX/JSX)**
- Test runner: **Jest + React Testing Library**
- Sadece **UI context/scenario** için attribute DSL:
  - `data-test-context`
  - `data-test-scenario`
  - `data-test-id`
  - `data-test-step`
  - `data-test-expect`
  - `data-test-route` (opsiyonel)
- E2E: Cypress için basit generator (happy path)

Çıkış kriteri:

- Örnek bir React projesinde, 2–3 context (login, search, checkout) için,
- Attribute DSL ile yazılmış context/scenario’lardan,
- Jest/RTL ve Cypress testlerinin otomatik üretiliyor olması.

### Faz 1 — Core Altyapı ve React PoC

1. **Core Types & IR module**
   - `TestIR`, `TestSuite`, `TestCase`, `TestStep`, `TestExpectation` interface’lerini oluştur.
   - Basit bir IR builder (in-memory).

2. **React Parser**
   - `@babel/parser` ile TSX/JSX parse et.
   - `data-test-*` attribute’larını yakalayan bir traversal yaz.
   - Basit context/senario/step/expect ilişkisini kur.

3. **Minimal DSL Parser**
   - `data-test-step` stringlerini parse eden fonksiyon:
     - `"type:user@example.com"` → `{ action: "type", value: "user@example.com" }`
   - `data-test-expect` stringlerini parse eden fonksiyon.

4. **IR Builder Integration**
   - AST traversal sonucunu IR’e döken pipeline yaz.
   - Debug için log’lar ekle (hangi context/scenario bulundu vs.).

5. **React + RTL UI Test Generator**
   - IR → Jest/RTL test dosyası.
   - Component import bilgisi için başlangıçta config üzerinden explicit verilebilir.

6. **CLI Skeleton**
   - `testgen scan`
   - `testgen generate`
   - Config dosyasının load edilmesi.

### Faz 2 — E2E (Cypress) Desteği

1. IR’e `type: "e2e"` case’ler ekle (config veya DSL ile).
2. `data-test-route` veya comment macro ile route tanımı ekle.
3. Cypress generator’ü yaz:
   - IR steps → `cy.get().type()/click()` mapping.
   - IR expectations → `cy.get().should()` mapping.
4. IR ve generator’leri CLI üzerinden entegre et.

### Faz 3 — Comment DSL ve Validation

1. Comment DSL parser:
   - `@test-context`, `@test-scenario`, `@test-route`, `@steps`, `@expect` macro’ları.
2. Attribute ve comment DSL’ini birleştiren IR builder:
   - Aynı context/scenario’yu farklı kaynaklardan merge et.
3. `testgen validate` komutu:
   - DSL grammar hataları
   - Desteklenmeyen action/expect type’ları
   - Unique `data-test-id` kontrolü
   - Pattern conflicts
4. Validation raporları ve CI exit code stratejisi.

### Faz 4 — Pattern Library (`data-test-from`)

1. Pattern’ler için JSON formatı tanımla.
2. Config’te `patternsFile` path’i al.
3. IR builder’da, context/senario parse edilirken pattern’leri resolve et.
4. Override/extend kurallarını uygula (config üzerinden behaviour).

### Faz 5 — Vue / Svelte Desteği

1. Vue:
   - `@vue/compiler-sfc` ile `<template>` AST’sini parse et.
   - `data-test-*` attribute’larını benzer mantıkla topla.
   - IR builder’a Vue adapter’ı ekle.

2. Svelte:
   - `svelte/compiler` ile parse.
   - Directive ve attribute’ları topla.

3. CLI framework konfigürasyonu:
   - `framework.default` + `framework.overrides` ile dosya pattern’lerine göre parser seçimi.

### Faz 6 — Gelişmiş Özellikler

- Playwright generator
- Unit / logic test DSL
- Multi-project / monorepo desteği
- Editor entegrasyonları (VSCode extension, hint’ler vs.)

---

## 6.3. Riskler ve Çözüm Önerileri

### 6.3.1. DSL Karmaşıklığı

Risk:

- DSL çok hızlı karmaşıklaşırsa, kullanıcılar kullanmak istemez.

Çözüm:

- DSL’i **incremental** tasarla.
- Basit use-case’ler için minimal syntax yeterli olsun.
- Advanced syntax’ları (JSON DSL, custom action, custom expectation) document’te ayrı bölümde tut.

### 6.3.2. Selector “Drift” Problemi

Risk:

- UI değiştiğinde, selector’lar (data-test-id vs.) bozulabilir.

Çözüm:

- `data-test-id`’leri stable tanımlamak (refactor’da değişmemesi).
- `validate` komutuyla **yetim** DSL direktiflerini bulmak.
- Mümkün olduğunca semantik selector’ları (role, text) destekleyip teşvik etmek.

### 6.3.3. Performans

Risk:

- Büyük projelerde tüm dosyaları parse etmek yavaş olabilir.

Çözüm:

- İlk `scan` sonrası incremental `watch` moduna geçmek.
- Parser’ları optimize etmek, gerekirse cache mekanizması eklemek.
- Çok büyük monorepo’larda config ile scope daraltmak (`sourceGlobs`).

---

## 6.4. Başarı Kriterleri

1. **Developer Experience**
   - Geliştirici, sadece UI koduna birkaç `data-test-*` attribute’u ekleyerek test oluşturabilmeli.
   - CLI çıktıları anlaşılır olmalı.
   - Hata mesajları doğrudan ilgili satıra işaret etmeli.

2. **Test Kalitesi**
   - Generated testler gerçek hayatta CI pipeline’ında güvenle koşabilmeli.
   - Flaky test sayısı düşük olmalı (özellikle E2E).

3. **Adoption**
   - En az bir production projesinde aktif olarak kullanılabilmesi.
   - Geri bildirimlere göre DSL ve generator’ların revize edilebilir olması.

---

## 6.5. Sonuç

Bu implementation plan, projeyi:

- Öğrenilebilir,
- Kademeli olarak genişletilebilir,
- Framework-agnostic bir test üretim sistemi

haline getirmek için somut adımlar sunar.

İlk PoC’i tamamladıktan sonra, gerçek proje ihtiyaçlarına göre DSL’i rafine etmeye devam ederek, hem UI hem unit hem de otomasyon testlerini besleyen güçlü bir altyapıya sahip olabilirsin.
