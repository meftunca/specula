# Example App

Bu klasör, TestWeaver için **gerçek React kullanım örneklerini** içerir. Amaç sadece demo UI göstermek değil; parser, validation ve generator davranışını gerçek bileşenler üzerinde görmek.

## İçerdiği örnek bileşenler

- `Login.tsx`
- `Search.tsx`
- `ContactForm.tsx`
- `Modal.tsx`

Bu bileşenlerde `data-test-*` attribute DSL’i kullanılır ve TestWeaver bu işaretlerden Vitest + Playwright testleri üretir.

## Geliştirme

```bash
npm install
npm run dev
```

## TestWeaver ile gerçek generate akışı

Bu uygulama üzerinde gerçek üretim için proje kökünden veya bu klasörden şu komut çalıştırılabilir:

```bash
cd example-app
node ../packages/testweaver/dist/cli/index.js generate
```

Validation için:

```bash
cd example-app
node ../packages/testweaver/dist/cli/index.js validate
```

## Üretilen gerçek dosyalar

Son generate çalıştırmasında aşağıdaki dosyalar üretildi:

### Vitest

- `__generated__/vitest/contact.submit-form.form.test.tsx`
- `__generated__/vitest/contact.submit-form.success.test.tsx`
- `__generated__/vitest/login.happy-path.test.tsx`
- `__generated__/vitest/modal-trigger.open-modal.test.tsx`
- `__generated__/vitest/modal.accessibility.test.tsx`
- `__generated__/vitest/search.happy-path.test.tsx`

### Playwright

- `__generated__/e2e/contact.submit-form.form.spec.ts`
- `__generated__/e2e/contact.submit-form.success.spec.ts`
- `__generated__/e2e/login.happy-path.spec.ts`
- `__generated__/e2e/modal-trigger.open-modal.spec.ts`
- `__generated__/e2e/modal.accessibility.spec.ts`
- `__generated__/e2e/search.happy-path.spec.ts`

## Bu örnek app neyi göstermeye yarıyor?

Bu app sayesinde şu konular gerçek veriyle görülebilir:

- context / scenario ayrımı
- farklı selector türleri (`data-test-id`, `data-test-role`, `data-test-label`, `data-test-placeholder`)
- step action’ları (`type`, `click`, `select`, `key`)
- expectation türleri (`visible`, `text`, `aria`, `has-class`)
- aynı kaynaktan hem Vitest hem Playwright üretimi

## Gerçek generate çıktısından gözlenen durum

Bu app üzerinde yaptığımız son generate doğrulamasında şu iyileşmeleri gördük:

1. **Doğru component export seçimi**
   - `modal-trigger.open-modal.test.tsx` artık `ModalDemo` import ediyor.

2. **State-aware branch ayrımı**
   - `ContactForm` artık `data-test-state="form"` ve `data-test-state="success"` kullanıyor.
   - Bu sayede form ve başarı branch’leri ayrı generated dosyalara ayrışıyor.

3. **Route uyumu**
   - Example app artık `/login`, `/search`, `/contact`, `/modal` route’larını gerçek anlamda servis ediyor.

### Hâlâ dikkat edilmesi gereken noktalar

- Generated Vitest import path’leri hâlâ `src/...` biçiminde üretiliyor; bu, her projede doğrudan çalışacak garanti bir çözüm değil.
- Generated Vitest import path’leri artık example-app içinde relative üretiliyor; yine de props/wrapper gerektiren komponentlerde ek render recipe ihtiyacı devam ediyor.
- Generated testleri bu example app içinde otomatik koşturan ayrı bir Vitest/Playwright smoke pipeline henüz tanımlı değil.

Bu yüzden bu app artık hem **çalışan örnek** hem de **kalan productization işleri için regression alanı** olarak kullanılabilir.

## Neden önemli?

Bu klasör artık sadece demo app değil; aynı zamanda:

- parser regression alanı,
- generator kalite kontrol alanı,
- dokümantasyon için gerçek örnek kaynağı

olarak kullanılabilir.
