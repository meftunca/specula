---
id: cli-spec
title: CLI Aracı Spesifikasyonu
sidebar_label: CLI Aracı
sidebar_position: 5
description: TestWeaver CLI aracı (testweaver) komutları ve konfigürasyonu
---


Bu doküman, test üretim sisteminin komut satırı aracı olan `testgen`’in davranışını, komutlarını ve konfigürasyon formatını tanımlar.

---

## 5.1. Amaç

`testgen` CLI aracı şunları yapar:

1. Proje kaynak kodunu tarar.
2. DSL (attribute + comment) direktiflerini toplar.
3. IR üretir ve/veya günceller.
4. IR’den UI/Unit/E2E test dosyaları generate eder.
5. DSL kullanımını doğrular ve hataları raporlar.
6. İsteğe bağlı olarak **watch mode** ile incremental generate yapar.

---

## 5.2. Kurulum

NPM paketi üzerinden global veya local kurulum:

```bash
npm install -D @your-org/testgen
```

`package.json` script örneği:

```jsonc
{
  "scripts": {
    "testgen": "testgen",
    "testgen:generate": "testgen generate",
    "testgen:validate": "testgen validate"
  }
}
```

---

## 5.3. Konfigürasyon Dosyası

Desteklenen formatlar:

- `testgen.config.js`
- `testgen.config.cjs`
- `testgen.config.mjs`
- `testgen.config.ts`
- `testgen.config.json`

### 5.3.1. Örnek TypeScript Config

```ts
import { defineConfig } from "@your-org/testgen";

export default defineConfig({
  projectRoot: ".",
  sourceGlobs: ["src/**/*.{ts,tsx,js,jsx,vue,svelte,html}"],

  framework: {
    default: "react",
    overrides: [
      { pattern: "**/*.vue", framework: "vue" },
      { pattern: "**/*.svelte", framework: "svelte" }
    ]
  },

  dsl: {
    patternsFile: "test-patterns.json",
    enforceUniqueTestIdsPerContext: true
  },

  ir: {
    outputFile: ".testgen/ir.json",
    pretty: true
  },

  generators: [
    {
      name: "jest-rtl",
      type: "ui",
      outputDir: "__generated__/ui",
      testFramework: "jest"
    },
    {
      name: "cypress",
      type: "e2e",
      outputDir: "cypress/e2e",
      e2eFramework: "cypress"
    }
  ]
});
```

### 5.3.2. Config Şema (Basit)

```ts
export interface TestgenConfig {
  projectRoot: string;
  sourceGlobs: string[];

  framework: {
    default: "react" | "vue" | "svelte" | "html";
    overrides?: { pattern: string; framework: string }[];
  };

  dsl?: {
    patternsFile?: string;
    enforceUniqueTestIdsPerContext?: boolean;
  };

  ir?: {
    outputFile?: string;
    pretty?: boolean;
  };

  generators: GeneratorConfig[];
}
```

`GeneratorConfig`, generator spec’te anlatılan formatla aynıdır.

---

## 5.4. Komutlar

### 5.4.1. `testgen scan`

Kaynak kodu tarar, DSL direktiflerini toplar ve IR üretir (veya günceller).

**Kullanım:**

```bash
testgen scan
```

**Opsiyonlar:**

- `--config <path>` — custom config dosyası
- `--output <file>` — IR output dosyasını override eder
- `--silent` — konsol çıktısını minimize eder

**Davranış:**

1. Config yüklenir.
2. `sourceGlobs` üzerinden dosyalar toplanır.
3. Her dosya için uygun parser seçilir (React/Vue/Svelte/HTML).
4. DSL attribute’ları ve comment macro’ları parse edilir.
5. IR in-memory oluşturulur ve dosyaya yazılır (örn: `.testgen/ir.json`).

### 5.4.2. `testgen generate`

Var olan IR’den (veya on-the-fly IR üreterek) test dosyaları generate eder.

**Kullanım:**

```bash
testgen generate
```

Opsiyonlar:

- `--ir <file>` — IR dosya path’i
- `--config <path>`
- `--suite <context>` — sadece belirli context için generate
- `--case <id>` — sadece belirli case için generate
- `--clean` — output klasörlerini generate öncesi temizle

Davranış:

1. IR load edilir (veya yoksa `scan` tetiklenir).
2. Config’te tanımlı generator’lar için:
   - Suite ve case’ler filtrelenir.
   - `generateSuite` çağrılır.
   - Dönen `GeneratedFile`’lar diske yazılır.

### 5.4.3. `testgen validate`

DSL kullanımını ve IR’i doğrular, hataları ve uyarıları raporlar.

**Kullanım:**

```bash
testgen validate
```

Opsiyonlar:

- `--config <path>`
- `--ir <file>`
- `--strict` — warning’leri de error olarak değerlendirme

Davranış:

1. IR yoksa `scan` çalıştırılır.
2. DSL kuralları, IR şeması, generator uyumluluğu vs. kontrol edilir.
3. Konsola rapor yazılır.
4. `--strict` modunda error veya warning varsa exit code ≠ 0 döner.

### 5.4.4. `testgen watch`

Dosya değişikliklerini izler, incremental `scan` + `generate` yapar.

**Kullanım:**

```bash
testgen watch
```

Opsiyonlar:

- `--config <path>`
- `--debounce <ms>`

Davranış:

1. İlk `scan` + `generate` yapılır.
2. File watcher başlar (chokidar vb.).
3. Değişen dosyalar için ilgili suite/case’ler yeniden parse edilir.
4. Sadece etkilenen test dosyaları yeniden generate edilir.

---

## 5.5. Çıktı ve Log Formatı

Standart log formatı:

```text
[INFO ] Scanning sources...
[INFO ] Found 42 files.
[INFO ] Parsed 10 contexts, 24 scenarios.
[INFO ] IR written to .testgen/ir.json (12 KB).
[INFO ] Running generator: jest-rtl
[INFO ] Generated 12 UI test files in __generated__/ui.
[INFO ] Running generator: cypress
[INFO ] Generated 8 E2E test files in cypress/e2e.
```

Hata durumunda:

```text
[ERROR] src/components/Login.tsx:15: Invalid action "tap". Supported: click, type, change, focus, blur, key
```

CI entegrasyonu için exit code:

- `0` — başarı
- `1` — fatal error (config, parser, invalid DSL)
- `2` — validation fail (strict modda warning dahil)

---

## 5.6. Performans ve Incremental Build

- İlk `scan` tüm dosyaları parse eder.
- `watch` modunda:
  - Sadece değişen dosyalar yeniden parse edilir.
  - Etkilenen IR parçaları (ilgili suite/case’ler) güncellenir.
  - Generator’lar incremental olarak tetiklenebilir (yalnızca değişen context/scenario için).

---

## 5.7. Extensibility

- Yeni framework veya parser eklemek için:
  - `Parser` interface’i uygulanır.
- Yeni generator eklemek için:
  - `TestGenerator` interface’i uygulanır ve config’e eklenir.
- Organizasyon bazlı ek DSL kuralları için:
  - `validate` pipeline’ına plugin eklenebilir.

Bu spec, `testgen` CLI aracının nasıl davranacağını ve projeye nasıl entegre edileceğini bütüncül şekilde tanımlar.
