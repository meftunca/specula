---
id: intro
title: Sistem Genel Bakışı
sidebar_label: Genel Bakış
sidebar_position: 1
description: TestWeaver için genel mimari, bugünkü stabil kapsam ve uzun vadeli yön
---

## 1.0. Durum Notu

Bu sayfa, TestWeaver’ın **genel sistem vizyonunu** anlatır. Ancak mevcut implementasyon ile uzun vadeli hedefler aynı şey değildir.

### Bugün stabil olan kapsam

- React `tsx` / `jsx` parsing
- Attribute tabanlı DSL (`data-test-*`)
- Vitest + React Testing Library output
- Playwright output
- Validation ve watch mode

### Henüz roadmap’te olan alanlar

- Vue / Svelte / plain HTML desteği
- Comment macro DSL
- Genişletilmiş unit / logic DSL

Bu nedenle aşağıdaki bölümler yer yer **hedef mimariyi** anlatır; hepsi mevcut kod tabanında tamamlanmış özellikler olarak okunmamalıdır.

## 1.1. Problem Tanımı

Modern frontend projelerinde UI bileşenleri çok hızlı evriliyor. Testler ise çoğu zaman:

- gecikiyor,
- ekip içinde standart dışı kalıyor,
- geliştiricinin kişisel disiplinine bağımlı oluyor.

Ama UI kodunun kendisi aslında test üretimi için çok değerli sinyaller taşıyor:

- hangi context içinde çalıştığı,
- hangi kullanıcı adımlarını beklediği,
- hangi elementlerle etkileşim kurulacağı,
- hangi sonuçların doğrulanacağı.

TestWeaver’ın temel amacı şudur:

> UI kodunun içine küçük DSL parçaları yerleştirerek, test üretimini daha deklaratif ve daha tekrarlanabilir hale getirmek.

## 1.2. Temel Yaklaşım

Sistem üç ana aşamadan oluşur:

1. **Source Scan & Parse**
   - Bugünkü implementasyonda React TSX/JSX dosyaları AST seviyesinde parse edilir.
   - `data-test-*` attribute’ları toplanır.
   - Bunlar framework-agnostic bir ara temsile dönüştürülür.

2. **IR (Intermediate Representation)**
   - Toplanan bilgi context / scenario / step / expectation yapısına normalize edilir.
   - IR, generator katmanından önce ortak sözleşme görevi görür.

3. **Generator’lar**
   - Bugün iki ana çıktı üretilir:
     - React Testing Library + Vitest
     - Playwright

## 1.3. Context-Based Tasarım

- `<form>` etiketine bağımlı değildir.
- Context ve scenario bazlı çalışır.
- Modal, wizard, side panel, arama yüzeyi gibi klasik form olmayan akışları da kapsayabilir.

Örnek bir React DSL bloğu:

```jsx
<div
  data-test-context="login"
  data-test-scenario="happy-path"
  data-test-route="/login"
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
    data-test-expect="visible; text:Welcome"
  />
</div>
```

Bu bloktan çıkarılan bilgi kabaca şöyledir:

- context: `login`
- scenario: `happy-path`
- steps:
  - email → `type:user@example.com`
  - password → `type:123456`
  - submit → `click`
- expectations:
  - success-message → `visible`
  - success-message → `text:Welcome`

## 1.4. Bugünkü Mimari Resim

Bugünkü çalışan akış şu şekildedir:

1. React bileşenleri taranır.
2. DSL attribute’ları parse edilir.
3. IR oluşturulur.
4. Aynı IR’den:
   - Vitest test dosyaları
   - Playwright test dosyaları
   üretilir.
5. `validate` komutu ile DSL kullanımı kontrol edilir.

## 1.5. Modüller

- **Core Parser**
  - React TSX/JSX için Babel tabanlı parser
- **Validation**
  - DSL kurallarını ve yapısal problemleri kontrol eder
- **IR Builder**
  - parse sonucunu ortak modele dönüştürür
- **Generators**
  - Vitest ve Playwright çıktısı üretir
- **CLI**
  - `generate`, `validate`, `watch` akışlarını yönetir

## 1.6. Kapsam ve Hedefler

### 1.6.1. Mevcut stabil sürüm

- Framework: React (JSX/TSX)
- DSL: Attribute-based context / scenario / step / expect
- UI test output: Vitest + React Testing Library
- E2E output: Playwright
- CLI: generate / validate / watch

### 1.6.2. Sonraki aşamalar

- Vue ve Svelte desteği
- Comment macro DSL
- Daha geniş unit / logic DSL
- Pattern library ve gelişmiş config deneyimi

## 1.7. Özet

Bugün TestWeaver en doğru şekilde şu cümleyle tarif edilir:

> **React-first, attribute-DSL tabanlı, Vitest ve Playwright üreten bir test generator.**

Diğer dokümanlar daha geniş ürün vizyonunu taşımaya devam eder; ancak mevcut kod tabanını değerlendirirken bu sayfadaki stabil kapsam esas alınmalıdır.
