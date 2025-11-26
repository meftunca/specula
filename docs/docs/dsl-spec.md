---
id: dsl-spec
title: DSL Spesifikasyonu
sidebar_label: DSL Spesifikasyonu
sidebar_position: 2
description: TestWeaver DSL - Attribute ve Comment tabanlı direktif tanımları
---


Bu doküman, UI kodunun içine yerleştirilen **attribute** ve **comment** tabanlı DSL’in detaylı tanımını yapar.

---

## 2.1. Temel Kavramlar

DSL, üç ana kavram üzerine kurulu:

1. **Context**  
   - Tek bir iş akışını temsil eder (ör: `login`, `checkout`, `search`).
   - Birden fazla scenario içerebilir.

2. **Scenario**  
   - Context içindeki spesifik bir test varyasyonunu temsil eder.
   - Ör: `happy-path`, `invalid-email`, `missing-password`.

3. **Step & Expectation**  
   - **Step**: Kullanıcı aksiyonları (type, click, change, select…).
   - **Expectation**: Beklenen sonuç (visible, text content, value, aria state, url vs.).

---

## 2.2. Attribute Tabanlı DSL

Attribute DSL’i, HTML / JSX / Vue / Svelte template içinde `data-test-*` attribute’ları ile tanımlanır.

### 2.2.1. Context ve Scenario Tanımı

Herhangi bir container element (div, section, component root vs.) context ve scenario tanımı yapabilir.

**Zorunlu attribute’lar:**

- `data-test-context` — Context adı (string)
- `data-test-scenario` — Scenario adı (string)

Opsiyonel:

- `data-test-scenario-group` — scenario’ları gruplamak için (örn: `validation`, `happy-paths`)
- `data-test-route` — E2E testler için bu context’in route bilgisi (örn: `/login`, `/checkout`)

**Örnek (React JSX):**

```jsx
<section
  data-test-context="login"
  data-test-scenario="happy-path"
  data-test-route="/login"
>
  {/* steps ve expectations burada */}
</section>
```

### 2.2.2. `data-test-id` (Selector Kimliği)

Herhangi bir element, testlerde kullanılmak üzere bir kimlik alabilir:

- `data-test-id="email"`

Bu, IR’de şu selector’a map edilir:

- Default: `[data-test-id="email"]`
- React Testing Library: `screen.getByTestId("email")`
- Cypress: `cy.get("[data-test-id=email]")`

**Kurallar:**

- Proje genelinde `data-test-id`’ler benzersiz olmak zorunda **değil**, ama
- Aynı context + scenario içinde **benzersiz** olması tavsiye edilir.
- Config ile “context scoped unique” kuralı enforced edilebilir.

### 2.2.3. `data-test-step` (Kullanıcı Aksiyonları)

Bir element üzerinde yapılacak aksiyon(lar)ı tanımlar.

**Basit string DSL formatı:**

- `"type:VALUE"` → input alanına VALUE yaz.
- `"click"` → elementi tıkla.
- `"change:VALUE"` → change event’ini VALUE ile tetikle.
- `"focus"` / `"blur"`
- `"key:Enter"` → element focus’ta iken Enter tuşuna bas.

**Örnekler:**

```jsx
<input
  data-test-id="email"
  data-test-step="type:user@example.com"
/>

<button
  data-test-id="submit"
  data-test-step="click"
>
  Login
</button>

<input
  data-test-id="search"
  data-test-step="type:hello; key:Enter"
/>
```

String DSL, `;` ile birden fazla aksiyon barındırabilir.

**Alternatif JSON formatı (ileri seviye):**

```jsx
<button
  data-test-id="submit"
  data-test-step='[
    { "action": "click" },
    { "action": "waitFor", "selector": "[data-test-id=success-message]" }
  ]'
/>
```

Parser, string DSL ve JSON DSL’i ayırt eder:

- JSON ise: `JSON.parse` ile doğrudan step listesine dönüştürülür.
- String ise: basit bir tokenizer ile action/value parçalarına ayrılır.

### 2.2.4. `data-test-expect` (Beklentiler / Assert’ler)

Bir element üzerinde assert edilecek koşulları tanımlar.

**Basit string DSL formatı:**

- `"visible"` → element görünür olmalı.
- `"not-visible"` → element görünür olmamalı.
- `"exists"` / `"not-exists"`
- `"text:Welcome"` → element `Welcome` içermeli.
- `"exact-text:Welcome"` → elementin text’i tam olarak `Welcome` olmalı.
- `"value:123"` → element value’su `123` olmalı.
- `"has-class:active"` / `"not-has-class:disabled"`
- `"aria:disabled=true"`

**Örnekler:**

```jsx
<p
  data-test-id="success-message"
  data-test-expect="visible; text:Welcome"
>
  Welcome
</p>

<span
  data-test-id="error-email"
  data-test-expect="visible; text:Invalid email"
/>
```

**JSON formatı (complex case’ler):**

```jsx
<div
  data-test-id="summary"
  data-test-expect='[
    { "assert": "visible" },
    { "assert": "containsText", "value": "Total:" },
    { "assert": "snapshot", "name": "checkout-summary" }
  ]'
/>
```

### 2.2.5. `data-test-from` (Predefined Pattern’ler)

Tekrar eden senaryoları merkezi bir pattern library’den çekmek için:

- `data-test-from="login-happy-path"`

Pattern’ler JSON veya JS/TS modülü olarak tanımlanır:

```jsonc
// test-patterns.json
{
  "login-happy-path": {
    "type": "ui",
    "steps": [
      { "action": "type", "target": "[data-test-id=email]", "value": "user@example.com" },
      { "action": "type", "target": "[data-test-id=password]", "value": "123456" },
      { "action": "click", "target": "[data-test-id=submit]" }
    ],
    "expectations": [
      {
        "assert": "visible-text",
        "target": "[data-test-id=success-message]",
        "value": "Welcome"
      }
    ]
  }
}
```

Context içindeki elementler kendi `data-test-step` ve `data-test-expect` attribute’larıyla pattern’i:

- **override** edebilir (aynı target için yeni değer)
- **extend** edebilir (yeni step/expect eklenir)

Çakışma kuralları config’te belirlenir:

- `patternFirst` (pattern → DSL override eder)
- `dslFirst` (DSL → pattern override eder) **(önerilen default)**

---

## 2.3. Comment Tabanlı DSL

Comment DSL, özellikle:

- Dom’a attribute koymak istemeyen,
- Daha soyut akışları tarif etmek isteyen,
- Veya unit/logic testlerini tarif etmek isteyen senaryolar için kullanılır.

### 2.3.1. Context & Scenario Comment Macro’ları

**Syntax:**

```ts
// @test-context <context-name>
// @test-scenario <scenario-name>
// @test-route <route>          (opsiyonel, E2E için)
// @test-type <ui|unit|e2e>     (opsiyonel, default: ui)
```

**Örnek:**

```ts
// @test-context login
// @test-scenario invalid-email
// @test-route /login
// @test-type e2e

export function LoginPage() {
  ...
}
```

### 2.3.2. Steps ve Expectations

Basit step/expect DSL’i:

```ts
// @steps
//   type: [data-test-id=email] "not-an-email"
//   type: [data-test-id=password] "123456"
//   click: [data-test-id=submit]
//
// @expect
//   visible-text: [data-test-id=error-email] "Invalid email"
//   not-visible: [data-test-id=success-message]
```

**Kurallar:**

- `@steps` bloğu, bir veya daha fazla satırdan oluşur.
- `@expect` bloğu da benzer şekilde.
- Her satırda:
  - `<action>: <selector> <opsiyonel değer>`

**Örnek açıklama:**

- `type: [data-test-id=email] "not-an-email"`
  - action: `type`
  - target: `[data-test-id=email]`
  - value: `"not-an-email"`

**Desteklenen action ve assert türlerinin listesi** IR spec ve generator spec’te daha detaylı açıklanır.

### 2.3.3. Gelişmiş Örnek

```ts
// @test-context checkout
// @test-scenario happy-path
// @test-route /checkout
// @test-type e2e
// @steps
//   type: [data-test-id=cart-item-1-qty] "2"
//   click: [data-test-id=next-step]
//   type: [data-test-id=address-line1] "Test Mah. Cad. Sok."
//   click: [data-test-id=next-step]
//   click: [data-test-id=confirm-order]
// @expect
//   visible-text: [data-test-id=success-message] "Order created"
//   url-contains: "/checkout/success"

export function CheckoutWizard() {
  ...
}
```

---

## 2.4. DSL Versiyonlama

Her DSL kullanımı, IR’e taşınırken bir `dslVersion` alanı alır:

- `1` — Bu dokümandaki grammar.
- İleride breaking change yapıldığında yeni versiyonlar eklenebilir.

Örnek IR parçası:

```jsonc
{
  "dslVersion": 1,
  "context": "login",
  "scenario": "happy-path",
  ...
}
```

---

## 2.5. Hata Yönetimi ve Validation Kuralları

### 2.5.1. Sık Karşılaşılan Hatalar

- Aynı elementte hem string DSL hem JSON DSL kullanmak
- Geçersiz action adı (`tap` gibi tanımsız bir aksiyon)
- Geçersiz assert adı
- Bozuk JSON string’i
- Aynı context + scenario içinde çakışan `data-test-id` kullanımının kurala aykırı olması

### 2.5.2. Validation Mekanizması

CLI üzerinden `testgen validate` komutu:

- Tüm DSL kullanımını tarar.
- Hataları ve uyarıları raporlar:
  - ERROR: test generate olmayacak kadar kritik.
  - WARNING: generate olur ama mantıksal problem ihtimali yüksek.
  - INFO: iyileştirme önerisi.

Rapor formatı:

```text
[ERROR]  src/components/Login.tsx:15: Invalid action "tap". Supported: click, type, change, focus, blur, key
[WARN ]  src/components/Login.tsx:22: data-test-id "email" is used in multiple steps in the same scenario.
```

Bu spec, DSL tarafında gerekli tüm kavramların tanımını sağlar. IR ve generator katmanlarında bu DSL’in nasıl işlendiği diğer dokümanlarda anlatılacaktır.
