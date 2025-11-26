---
id: intro
title: Sistem Genel Bakışı
sidebar_label: Genel Bakış
sidebar_position: 1
description: TestWeaver - Context tabanlı otomatik test üretim sistemi genel mimarisi
---


## 1.1. Problem Tanımı

Modern frontend projelerinde (React, Svelte, Vue, HTML):

- UI bileşenleri çok hızlı evriliyor.
- Form kavramı giderek flu hale geliyor (custom hooks, context, headless UI, modallar, wizard’lar…).
- Unit ve E2E testlerin yazılması genelde:
  - Gecikiyor,
  - Standart dışı,
  - Geliştiricinin kişisel disiplinine kalıyor.

Ama UI kodunun kendisi, testler hakkında çok güzel “ipucu” sağlayabilecek durumda:

- Hangi component hangi context’te?
- Hangi interaction senaryoları var? (happy-path, invalid, edge-case…)
- Hangi elementte hangi aksiyon yapılmalı?
- Testte beklenen sonuç ne?

Bu sistemin amacı:

> UI kodunun içine **küçük DSL parçaları** serpiştirerek, testleri **otomatik üretmek** ve “test yazmayı” büyük ölçüde deklaratif hale getirmek.

---

## 1.2. Temel Yaklaşım

Sistem üç ana aşamadan oluşur:

1. **Source Scan & Parse**
   - React/Svelte/Vue/HTML dosyalarını AST seviyesinde parse eder.
   - `data-test-*` attribute’ları ve `@test-*` comment macro’larını toplar.
   - Bunları framework’ten bağımsız, normalleştirilmiş bir yapıya dönüştürür.

2. **IR (Intermediate Representation)**
   - Toplanan veriyi **context-based bir IR** haline getirir.
   - IR, "form" kavramından tamamen bağımsızdır.
   - IR’de şu kavramlar vardır:
     - `context` (örn: login, checkout, search)
     - `scenario` (örn: happy-path, invalid-email, missing-password)
     - `steps` (action’lar)
     - `expectations` (assert’ler)

3. **Test Generator’lar**
   - IR’den farklı test tiplerine dönüştüren modüller:
     - **UI / Component Test Generatörü**
       - Örn: React Testing Library / Vue Testing Library
     - **Unit Test Generatörü**
       - Örn: Jest / Vitest (pure functions + hooks + component logic)
     - **Otomasyon / E2E Test Generatörü**
       - Örn: Cypress / Playwright

---

## 1.3. Context-Based Tasarımın Özellikleri

- `<form>` etiketine **bağımlı değildir**.
- Herhangi bir UI parçası, bir **context** ve bir veya birden fazla **scenario** altında tanımlanabilir.
- Multi-step wizard, modal içi form, side panel işlemi gibi yapıları rahatlıkla kapsar.

Örnek (React JSX):

```jsx
<div
  data-test-context="login"
  data-test-scenario="happy-path"
>
  <Input
    data-test-id="email"
    data-test-step="type:user@example.com"
  />
  <Input
    data-test-id="password"
    data-test-step="type:123456"
  />
  <Button
    data-test-id="submit"
    data-test-step="click"
  >
    Login
  </Button>

  <Alert
    data-test-id="success-message"
    data-test-expect="visible-text:Welcome"
  />
</div>
```

Bu bloktan, sistem otomatik olarak şu bilgileri çıkarır:

- context: `login`
- scenario: `happy-path`
- steps:
  - email → type “user@example.com”
  - password → type “123456”
  - submit → click
- expectations:
  - success-message → visible-text “Welcome”

Bu IR daha sonra:

- React Testing Library unit testi,
- Cypress E2E testi,
- Gerekirse başka runner’lar (Playwright, WebdriverIO…) için generate edilebilir.

---

## 1.4. Test Katmanları

### 1.4.1. UI / Component Testleri

Amaç:

- Component’in temel UI davranışını,
- Kullanıcının gördüğü/etkileşime girdiği surface’i,
- Basit validation ve state değişimlerini test etmek.

Özellikler:

- Component render edilir (unit veya integration seviyesinde).
- DSL’de tanımlanan step’ler uygulanır.
- DSL’de tanımlanan expectation’lar assert edilir.

### 1.4.2. Unit Testleri

Amaç:

- Pure function’lar,
- Custom hook’lar,
- İş kuralları (business logic),
- Reducer / state machine’ler…

İki kaynak olabilir:

1. DSL üzerinden gelen context/scenario’lar → ilgili logic fonksiyonlarına map edilerek unit test üretilmesi.
2. Ayrı bir “logic DSL” tanımlanarak (örn. `@unit-test` macro’ları) doğrudan fonksiyon bazlı tanımlar.

Bu dokümanda ana odak UI/interaction DSL olduğu için, unit tarafı **daha küçük ama extensible bir spec** olarak verilecektir.

### 1.4.3. Otomasyon (E2E) Testleri

Amaç:

- Gerçek kullanıcı akışlarını test etmek.
- Routing, network, backend entegrasyonları ile birlikte uçtan uca davranışı doğrulamak.

Özellikler:

- IR içindeki `context` + `scenario` kombinasyonları,
  - `route` bilgisi (comment veya config’ten),
  - `steps` ve `expectations` ile beraber E2E runner’lara (Cypress, Playwright) çevrilir.

---

## 1.5. Yüksek Seviye Mimarinin Modülleri

1. **Core Parser**
   - Çeşitli framework’ler için adapter’lar:
     - React (Babel)
     - Vue (`@vue/compiler-sfc`)
     - Svelte (`svelte/compiler`)
     - Plain HTML (parse5 vs.)
   - Tek bir unified AST interface’ine normalize eder.
   - DSL direktiflerini (attribute + comments) bu AST üzerinden toplar.

2. **DSL Interpreter**
   - `data-test-*` ve `@test-*` macro’larını parse eder.
   - Hatalı DSL kullanımını raporlar.
   - Çıktıyı IR modülüne iletir.

3. **IR Builder**
   - DSL’den gelen parçaları `Context`, `Scenario`, `Step`, `Expectation` objelerine dönüştürür.
   - IR’yi versiyonlanabilir bir formatta tutar (örn: `version: 1`).
   - IR’yi JSON veya JS/TS objesi olarak dışarıya verir.

4. **Generator’lar**
   - IR → test runner spesifik kod üreten modüller:
     - `jest-react-testing-library-generator`
     - `vitest-vue-generator`
     - `cypress-generator`
     - `playwright-generator`

5. **CLI & Config**
   - `testgen` CLI komutu:
     - `testgen scan`
     - `testgen generate`
     - `testgen validate`
     - `testgen watch`
   - Proje kökünde `testgen.config.(js|ts|json)` ile yapılandırılır.

---

## 1.6. Kapsam ve Hedefler

### 1.6.1. İlk Versiyon (MVP)

- Framework: React (JSX/TSX)
- Test runner: Jest + React Testing Library
- Otomasyon runner: Cypress
- DSL:
  - Attribute-based context/scenario/step/expect
  - Comment-based context/scenario/route/steps/expect (basit grammar)

### 1.6.2. Sonraki Aşamalar

- Vue ve Svelte desteği
- Playwright desteği
- Custom hook / logic için unit test DSL’leri
- Pattern library (`data-test-from="predefined-xxx"`) için merkezi yönetim

Bu overview, diğer dokümanlarda detaylandırılacak spesifikasyonun çerçevesini çizer.
