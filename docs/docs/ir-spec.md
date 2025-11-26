---
id: ir-spec
title: IR Spesifikasyonu
sidebar_label: IR Spesifikasyonu
sidebar_position: 3
description: TestWeaver Intermediate Representation (Ara Temsil) şeması
---


Bu doküman, DSL’den toplanan bilgilerin dönüştürüldüğü **IR (Intermediate Representation)** şemasını tanımlar.

IR’in amacı:

- DSL’in tüm detaylarını kaybetmeden,
- Framework ve test runner bağımsız,
- Versiyonlanabilir ve genişletilebilir bir veri modeli sunmaktır.

---

## 3.1. IR Genel Yapısı

IR mantıksal olarak üç seviyeye ayrılır:

1. **Suite (Context düzeyi)** — bir context’i temsil eder.
2. **Case (Scenario düzeyi)** — context içindeki her senaryoyu temsil eder.
3. **Step / Expectation** — tekil aksiyon ve assert’ler.

Top-level şema (TypeScript tipi):

```ts
export interface TestIR {
  version: 1;                 // IR versiyonu
  generatedAt: string;        // ISO tarih
  sourceRoot: string;         // Projenin root dizini
  suites: TestSuite[];
}
```

---

## 3.2. TestSuite (Context Seviyesi)

```ts
export interface TestSuite {
  id: string;                 // unique id (örn: login, checkout)
  context: string;            // context adı (örn: "login")
  description?: string;       // opsiyonel açıklama
  sourceFiles: SourceRef[];   // bu suite’i etkileyen dosyalar
  cases: TestCase[];          // scenario listesi
}
```

### 3.2.1. SourceRef

```ts
export interface SourceRef {
  filePath: string;           // src/components/Login.tsx
  framework: "react" | "vue" | "svelte" | "html";
  language: "js" | "ts" | "tsx" | "jsx" | "html" | "svelte" | "vue";
}
```

---

## 3.3. TestCase (Scenario Seviyesi)

```ts
export type TestCaseType = "ui" | "unit" | "e2e";

export interface TestCase {
  id: string;                 // unique, stable id (örn: login__happy-path)
  context: string;            // tekrar context (örn: "login")
  scenario: string;           // scenario adı (örn: "happy-path")
  type: TestCaseType;         // ui / unit / e2e
  route?: string;             // e2e için route (örn: "/login")
  tags?: string[];            // örn: ["happy-path", "smoke"]
  meta?: Record<string, any>; // ek metadata (ör: priority, owner vs.)

  // Kaynak kod referansları:
  definedAt: LocationRef[];   // bu case’in tanımlandığı yerler (DSL attribute/comment)
  usesPatterns?: string[];    // kullanılan pattern id’leri (data-test-from)

  // Asıl test içeriği:
  steps: TestStep[];
  expectations: TestExpectation[];
}
```

### 3.3.1. LocationRef

```ts
export interface LocationRef {
  filePath: string;
  line: number;
  column: number;
  via: "attribute" | "comment" | "pattern";
  raw?: string;               // orijinal DSL string’i (debug için)
}
```

---

## 3.4. TestStep (Aksiyonlar)

```ts
export type StepAction =
  | "click"
  | "type"
  | "change"
  | "focus"
  | "blur"
  | "key"
  | "custom"
  | "waitFor"
  | "submitContext"; // soyut submit (form olmayan context için bile)

export interface TestStep {
  id: string;                 // stable id (örn: step-1)
  action: StepAction;
  selector: Selector;         // hangi element (veya logical target)
  value?: any;                // type/typeValue, changeValue, key, vs.
  description?: string;       // insan okunur açıklama
  delayMs?: number;           // opsiyonel delay (E2E’de işe yarar)
  meta?: Record<string, any>; // framework spesifik ekstra bilgi

  // Kaynak referansı:
  source?: LocationRef;
}
```

### 3.4.1. Selector

Selector, framework bağımsız bir tanım sağlar:

```ts
export type SelectorType =
  | "css"
  | "testId"
  | "role"
  | "labelText"
  | "placeholder"
  | "custom";

export interface Selector {
  type: SelectorType;
  value: string;              // "[data-test-id=email]" veya "email" gibi
  options?: Record<string, any>; // örn: { exact: boolean }, aria seçenekleri vs.
}
```

**Örnekler:**

- Attribute DSL’den `data-test-id="email"`:

```json
{
  "type": "testId",
  "value": "email"
}
```

- Comment DSL’den `type: [data-test-id=email] "x"`:

```json
{
  "type": "css",
  "value": "[data-test-id=email]"
}
```

Generator’lar bu selector tiplerini kendi dünyalarına map eder:

- React Testing Library:
  - `testId` → `screen.getByTestId(value)`
  - `role` → `screen.getByRole(value, options)` vs.
- Cypress:
  - `css` → `cy.get(value)`

---

## 3.5. TestExpectation (Beklentiler)

```ts
export type ExpectType =
  | "visible"
  | "not-visible"
  | "exists"
  | "not-exists"
  | "text"
  | "exact-text"
  | "value"
  | "has-class"
  | "not-has-class"
  | "aria"
  | "url-contains"
  | "url-exact"
  | "snapshot"
  | "custom";

export interface TestExpectation {
  id: string;
  type: ExpectType;
  selector?: Selector;        // bazı assert’ler için gerekmez (örn: url-contains)
  value?: any;                // expected text/value/url/aria state vs.
  description?: string;
  meta?: Record<string, any>;
  source?: LocationRef;
}
```

**Örnek:**

`data-test-expect="visible; text:Welcome"`

```jsonc
[
  {
    "id": "exp-1",
    "type": "visible",
    "selector": { "type": "testId", "value": "success-message" }
  },
  {
    "id": "exp-2",
    "type": "text",
    "selector": { "type": "testId", "value": "success-message" },
    "value": "Welcome"
  }
]
```

`url-contains: "/checkout/success"`

```jsonc
{
  "id": "exp-3",
  "type": "url-contains",
  "value": "/checkout/success"
}
```

---

## 3.6. UI / Unit / E2E Ayrımı IR’de Nasıl Tutulur?

### 3.6.1. Case Type

`TestCase.type` alanı:

- `"ui"`
- `"unit"`
- `"e2e"`

### 3.6.2. Ek Metadata

UI testleri için:

```ts
meta: {
  componentName?: string;     // React component adı
  importPath?: string;        // import için path
}
```

Unit testleri için:

```ts
meta: {
  targetKind: "function" | "hook" | "reducer";
  targetName: string;
  importPath: string;
}
```

E2E testleri için:

```ts
meta: {
  suiteName?: string;         // Cypress describe adı
  retries?: number;
}
```

Bu metadata’lar DSL’den, pattern’lerden veya config’ten gelebilir.

---

## 3.7. Örnek Komple IR Nesnesi

```jsonc
{
  "version": 1,
  "generatedAt": "2025-11-25T10:00:00.000Z",
  "sourceRoot": "/path/to/project",
  "suites": [
    {
      "id": "login",
      "context": "login",
      "description": "Login akışına ait testler",
      "sourceFiles": [
        {
          "filePath": "src/components/Login.tsx",
          "framework": "react",
          "language": "tsx"
        }
      ],
      "cases": [
        {
          "id": "login__happy-path",
          "context": "login",
          "scenario": "happy-path",
          "type": "ui",
          "route": "/login",
          "tags": ["happy-path", "smoke"],
          "definedAt": [
            {
              "filePath": "src/components/Login.tsx",
              "line": 10,
              "column": 3,
              "via": "attribute"
            }
          ],
          "usesPatterns": ["login-happy-path"],
          "steps": [
            {
              "id": "step-1",
              "action": "type",
              "selector": {
                "type": "testId",
                "value": "email"
              },
              "value": "user@example.com"
            },
            {
              "id": "step-2",
              "action": "type",
              "selector": {
                "type": "testId",
                "value": "password"
              },
              "value": "123456"
            },
            {
              "id": "step-3",
              "action": "click",
              "selector": {
                "type": "testId",
                "value": "submit"
              }
            }
          ],
          "expectations": [
            {
              "id": "exp-1",
              "type": "visible",
              "selector": {
                "type": "testId",
                "value": "success-message"
              }
            },
            {
              "id": "exp-2",
              "type": "text",
              "selector": {
                "type": "testId",
                "value": "success-message"
              },
              "value": "Welcome"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 3.8. IR Versiyonlama ve Geriye Dönük Uyum

- `TestIR.version` alanı IR version’unu belirtir.
- Breaking değişiklik yapıldığında:
  - `version: 2` gibi yeni bir versiyon eklenir.
  - Generator’lar birden fazla versiyonu destekleyebilir (migration katmanı ile).

Migration örneği:

- `ir-v1` → `ir-v2` converter fonksiyonu:
  - Eksik alanları default ile doldurur.
  - Değişen enum değerlerini map eder.

Bu IR şeması, DSL’den gelen tüm bilgilerin tutarlı ve genişletilebilir şekilde temsil edilmesini sağlar ve generator’lar için sağlam bir temel sunar.
