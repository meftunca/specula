---
id: generators-spec
title: Generator Spesifikasyonu
sidebar_label: Generator Spesifikasyonu
sidebar_position: 4
description: TestWeaver test generatörleri - IR'den test runner'lara kod üretimi
---


Bu doküman, IR’den farklı test runner’lara (UI / Unit / E2E) nasıl kod üretileceğini (generator mantığını) tanımlar.

Ana hedefler:

- Her test runner için **deterministic ve idempotent** kod üretmek.
- Generated dosyaları `__generated__` gibi bir klasörde tutmak.
- İnsan tarafından okunabilir ve debug edilebilir olmak, ama elle düzenlenmemesi beklenir.

---

## 4.1. Genel Tasarım

Her generator, ortak bir interface’i uygular:

```ts
export interface TestGenerator {
  name: string; // "jest-rtl", "cypress", "playwright" vb.

  supports(caseType: TestCaseType): boolean;

  generateSuite(input: {
    ir: TestIR;
    suite: TestSuite;
    config: GeneratorConfig;
  }): GeneratedFile[];
}
```

`GeneratedFile` tanımı:

```ts
export interface GeneratedFile {
  filePath: string;  // proje köküne göre path
  content: string;   // test dosyasının tamamı
  kind: "ui" | "unit" | "e2e";
}
```

`GeneratorConfig` örneği:

```ts
export interface GeneratorConfig {
  outputDir: string;        // "__generated__" gibi
  importBasePath?: string;  // src/ import path’leri için base
  testFramework: "jest" | "vitest";
  e2eFramework: "cypress" | "playwright";
  fileNamePattern?: string; // örn: "{context}.{scenario}.test.tsx"
}
```

---

## 4.2. UI / Component Test Generator (React + RTL)

### 4.2.1. Hedef

- IR’de `type: "ui"` olan case’ler için,
- React + React Testing Library ile test dosyaları üretmek.

### 4.2.2. Dosya Adlandırması

Varsayılan pattern:

```text
__generated__/ui/{context}.{scenario}.test.tsx
```

Örnek:

- context: `login`
- scenario: `happy-path`

→ `__generated__/ui/login.happy-path.test.tsx`

### 4.2.3. Dosya Template’i

Temel template:

```ts
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { COMPONENT_IMPORT } from "COMPONENT_PATH";

describe("CONTEXT_NAME", () => {
  test("SCENARIO_NAME", async () => {
    render(<COMPONENT_NAME />);

    // STEPS_PLACEHOLDER

    // EXPECTATIONS_PLACEHOLDER
  });
});
```

Generator, IR’deki `TestCase.meta` içinden component bilgilerini kullanır:

```ts
meta: {
  componentName: "Login",
  importPath: "src/components/Login";
}
```

### 4.2.4. Step Mapping Kuralları

IR’den gelen `TestStep`’ler, sırayla test gövdesine yazılır.

**Selector Mapping (React Testing Library):**

- `Selector.type === "testId"`:
  - `screen.getByTestId(value)`
- `Selector.type === "role"`:
  - `screen.getByRole(value, options)`
- `Selector.type === "css"`:
  - fallback olarak `document.querySelector` veya custom helper

**Action Mapping:**

| StepAction   | RTL Kod Örneği                                           |
|-------------|-----------------------------------------------------------|
| `click`     | `fireEvent.click(element)`                               |
| `type`      | `fireEvent.change(element, { target: { value: "..." }})` |
| `change`    | `fireEvent.change(element, { target: { value: "..." }})` |
| `focus`     | `fireEvent.focus(element)`                               |
| `blur`      | `fireEvent.blur(element)`                                |
| `key`       | `fireEvent.keyDown(element, { key: "Enter" })`           |
| `waitFor`   | `await waitFor(...)`                                     |
| `submitContext` | context’teki temsilci element (submit buton) click edilir |

**Örnek Step Kod Üretimi:**

IR Step:

```jsonc
{
  "action": "type",
  "selector": { "type": "testId", "value": "email" },
  "value": "user@example.com"
}
```

Generated kod:

```ts
const email = screen.getByTestId("email");
fireEvent.change(email, { target: { value: "user@example.com" } });
```

### 4.2.5. Expectation Mapping Kuralları

| ExpectType       | RTL + Jest Kod Örneği                                      |
|------------------|------------------------------------------------------------|
| `visible`        | `expect(el).toBeVisible()`                                |
| `not-visible`    | `expect(el).not.toBeVisible()`                            |
| `exists`         | `expect(el).toBeInTheDocument()`                          |
| `not-exists`     | `expect(screen.queryByTestId("...")).not.toBeInTheDocument()` |
| `text`           | `expect(el).toHaveTextContent("...")`                     |
| `exact-text`     | `expect(el).toHaveTextContent(/^...$/)`                   |
| `value`          | `expect(el).toHaveValue("...")`                           |
| `has-class`      | `expect(el).toHaveClass("...")`                           |
| `not-has-class`  | `expect(el).not.toHaveClass("...")`                       |
| `aria`           | `expect(el).toHaveAttribute("aria-...", "value")`        |
| `snapshot`       | `expect(container).toMatchSnapshot("name")`              |

Generated kod örneği:

```ts
const success = screen.getByTestId("success-message");
expect(success).toBeVisible();
expect(success).toHaveTextContent("Welcome");
```

---

## 4.3. Unit Test Generator

Unit testler, daha çok logic odaklıdır:

- Pure function’lar
- Hooks (`useLogin`, `useCart`)
- Reducer’lar, state machine’ler

Bu dokümanda, UI DSL’den türeyebilecek minimal bir yaklaşım tanımlanır.

### 4.3.1. Varsayım

- DSL veya config, context→logic mapping’i sağlar:

```ts
meta: {
  unitTarget: {
    type: "hook",
    name: "useLogin",
    importPath: "src/hooks/useLogin"
  }
}
```

### 4.3.2. Örnek Üretim

IR Case:

- context: `login`
- scenario: `happy-path`
- steps:
  - type email, type password, click submit
- expectations:
  - success visible

Bu, hook için şu şekilde tekrar yorumlanabilir:

- Başlangıç state: `useLogin()`
- input’lar: `email`, `password`
- action: `submit()` çağrısı
- expect: `state.success === true`

Generated test (pseudo):

```ts
import { renderHook, act } from "@testing-library/react";
import { useLogin } from "src/hooks/useLogin";

describe("useLogin", () => {
  test("happy-path", async () => {
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.setEmail("user@example.com");
      result.current.setPassword("123456");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.success).toBe(true);
  });
});
```

Bu katman biraz proje spesifik olduğu için, generator bu mapping’i sadece metadata ve config verildiğinde üretir; default davranışı yoktur.

---

## 4.4. E2E Test Generator (Cypress)

### 4.4.1. Dosya Adlandırması

```text
cypress/e2e/{context}.{scenario}.cy.ts
```

### 4.4.2. Template

```ts
describe("CONTEXT_NAME", () => {
  it("SCENARIO_NAME", () => {
    cy.visit("ROUTE");

    // STEPS_PLACEHOLDER

    // EXPECTATIONS_PLACEHOLDER
  });
});
```

### 4.4.3. Step Mapping (Cypress)

| StepAction   | Cypress Kod Örneği                                      |
|-------------|----------------------------------------------------------|
| `click`     | `cy.get(selector).click()`                               |
| `type`      | `cy.get(selector).type(value)`                           |
| `change`    | `cy.get(selector).clear().type(value)`                   |
| `focus`     | `cy.get(selector).focus()`                               |
| `blur`      | `cy.get(selector).blur()`                                |
| `key`       | `cy.get(selector).type("{enter}")`                       |
| `waitFor`   | `cy.get(selector)` veya `cy.wait()` ferkli kullanım      |
| `submitContext` | context içindeki submit elementini bulup `.click()`  |

Selector string’i:

- `Selector.type === "testId"` → `[data-test-id=value]`
- `Selector.type === "css"` → doğrudan `value`

Örnek kod:

```ts
cy.get("[data-test-id=email]").type("user@example.com");
cy.get("[data-test-id=password]").type("123456");
cy.get("[data-test-id=submit]").click();
```

### 4.4.4. Expectation Mapping (Cypress)

| ExpectType     | Cypress Kod Örneği                                     |
|----------------|--------------------------------------------------------|
| `visible`      | `cy.get(selector).should("be.visible")`               |
| `not-visible`  | `cy.get(selector).should("not.be.visible")`           |
| `exists`       | `cy.get(selector).should("exist")`                    |
| `not-exists`   | `cy.get(selector).should("not.exist")`                |
| `text`         | `cy.get(selector).should("contain.text", value)`      |
| `exact-text`   | `cy.get(selector).should("have.text", value)`         |
| `value`        | `cy.get(selector).should("have.value", value)`        |
| `has-class`    | `cy.get(selector).should("have.class", value)`        |
| `not-has-class`| `cy.get(selector).should("not.have.class", value)`    |
| `aria`         | `cy.get(selector).should("have.attr", "aria-..", v)`  |
| `url-contains` | `cy.url().should("include", value)`                   |
| `url-exact`    | `cy.url().should("eq", value)`                        |

Örnek:

```ts
cy.get("[data-test-id=success-message]")
  .should("be.visible")
  .and("contain.text", "Welcome");

cy.url().should("include", "/checkout/success");
```

---

## 4.5. E2E Test Generator (Playwright)

Playwright desteği için benzer mapping kuralları:

- Dosya: `tests/e2e/{context}.{scenario}.spec.ts`
- Template:

```ts
import { test, expect } from "@playwright/test";

test.describe("CONTEXT_NAME", () => {
  test("SCENARIO_NAME", async ({ page }) => {
    await page.goto("ROUTE");

    // steps
    // expectations
  });
});
```

- Selector: `page.getByTestId("id")` veya `page.locator("css")`
- Action / Expectation mapping tabloları Cypress’e benzer.

---

## 4.6. Multi-Generator Strategy

`testgen generate` komutu, config’e göre bir veya birden fazla generator çalıştırır:

```ts
// testgen.config.ts
export default {
  generators: [
    {
      name: "jest-rtl",
      outputDir: "__generated__/ui",
      testFramework: "jest"
    },
    {
      name: "cypress",
      outputDir: "cypress/e2e"
    }
  ]
};
```

Çalışma sırası:

1. IR load edilir (veya on-the-fly üretilir).
2. Her generator için:
   - `generateSuite` çağrılır.
   - Dönen `GeneratedFile`’lar dosya sistemine yazılır.
3. Eski dosyalar (aynı pattern’e sahip) silinebilir veya overwrite edilir.

---

## 4.7. Idempotency ve Determinism

- Aynı IR ve config ile `testgen generate` her çalıştığında **aynı içerik** üretilmelidir.
- Dosya içeriklerinde tarih, random id gibi non-deterministic alanlar kullanılmamalıdır (veya stabil produce edilmelidir).
- Bu sayede git diff’leri temiz olur ve CI’da güvenilirlik artar.

---

## 4.8. Generated Kodun Yorumlanması ve Debug

- Generated dosyalarda dosyanın başına bir uyarı comment’i eklenir:

```ts
// THIS FILE IS AUTO-GENERATED BY testgen.
// DO NOT EDIT MANUALLY.
// Source: src/components/Login.tsx (context: login, scenario: happy-path)
```

- Hata durumunda (örneğin selector bulunamazsa):
  - IR’deki `LocationRef` bilgisi sayesinde kaynak koddaki ilgili satıra geri gidilebilir.
  - Gerekirse generator, comment olarak bu bilgiyi test dosyasına ekler:

```ts
// Step source: src/components/Login.tsx:25
```

Bu spec, IR’den çeşitli test runner’lara nasıl kod üretileceğini standartlaştırır ve yeni runner’lar eklemek için de net bir çerçeve sunar.
