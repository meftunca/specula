# 6. Implementation Plan & Roadmap

Bu doküman, TestWeaver için **production-readiness odaklı** geliştirme planını tanımlar. Amaç artık yalnızca çalışan bir React PoC’yi büyütmek değil; **UI semantiğini doğru modelleyen, güvenilir test üreten ve bunu CI seviyesinde doğrulayan** bir çekirdek oluşturmaktır.

---

## 6.1. Mevcut Durum Özeti

Bugünkü kod tabanı aşağıdaki temel yetenekleri zaten içerir:

- Dil: **TypeScript**
- Runtime: **Node.js**
- CLI: **`commander`**
- Config loading: **`cosmiconfig`**
- Watch mode: **`chokidar`**
- React/TSX/JSX parsing: **`@babel/parser` + `@babel/traverse`**
- UI generator: **Vitest + React Testing Library** odaklı çıktı
- E2E generator: **Playwright** odaklı çıktı
- Validation katmanları:
  - DSL validation
  - IR validation
- Gerçek entegrasyon örneği: **`example-app`**

Ancak production-ready olmak için hâlâ dört ana boşluk vardır:

1. **UI state ve branch semantiği tam modellenmiyor**
2. **React render contract bilgisi eksik**
3. **Generated testlerin gerçekten executable olduğu sürekli kanıtlanmıyor**
4. **Validation hâlâ tam semantik seviyeye çıkmış değil**

Bu nedenle yol haritası artık “özellik ekleyelim” değil; **çekirdeğe güvenelim, sonra genişleyelim** yaklaşımını izler.

---

## 6.2. Stratejik Öncelik Sırası

Geliştirme sırası aşağıdaki gibi olmalıdır:

1. **UI semantiğini doğru modellemek**
2. **React render contract’ını tanımlamak**
3. **Generated testlerin güvenilirliğini kanıtlamak**
4. **Validation’ı semantik seviyeye taşımak**
5. **Gerçek entegrasyon ve CI ürünleştirmesini kurmak**
6. **Ancak bundan sonra kapsamı Vue / Svelte / daha zengin UI etkileşimlerine genişletmek**

Bu sıralama bilinçli bir tercihtir:

- Erken genişleme, zayıf bir çekirdeğin üzerine ekstra karmaşıklık bindirir.
- Kullanıcı güveni, desteklenen framework sayısından çok **üretilen testin doğru ve çalışır olmasına** bağlıdır.
- UI davranışını modelleyemeyen bir IR, ne kadar güzel görünürse görünsün production seviyesinde güven vermez.

---

## 6.3. Production-Readiness Yol Haritası

### Faz 1 — UI Semantiğini Sağlamlaştırma

Bu fazın amacı, parser ve IR katmanını React UI davranışını daha doğru temsil eden bir yapıya taşımaktır.

#### Hedefler

- Branch-aware bir UI modeli kurmak
- Duplicate scenario davranışını deterministik hale getirmek
- Component/export çözümlemeyi güvenilirleştirmek
- Parser davranışını gerçek dünya JSX ağaçlarında daha öngörülebilir hale getirmek

#### Yapılacaklar

1. **Branch/state modelleme**
   - `success`, `error`, `loading`, `empty` gibi birbirini dışlayan UI durumlarını ayırt edecek IR alanları tasarla.
   - Aynı scenario içindeki mutually exclusive branch’lerin yanlışlıkla aynı testte birleşmesini engelle.

2. **Scenario variant stratejisi**
   - Aynı context içinde tekrar eden scenario’lar için açık bir politika belirle:
     - merge
     - error
     - variant
   - Bu davranışı CLI, validation ve generator katmanlarında aynı şekilde uygula.

3. **Component/export ownership**
   - JSX ağacının ait olduğu React export’unu AST seviyesinde güvenilir biçimde belirle.
   - Aynı dosyada birden fazla component/export olduğunda doğru hedefi IR’ye taşı.

4. **Parser edge-case sertleştirme**
   - Conditional rendering
   - nested context
   - fragments
   - expression container içindeki JSX
   - component composition
   senaryoları için fixture bazlı güvence ekle.

#### Çıkış Kriterleri

- Aynı senaryoda `success` ve `error` expectation’ları karışmaz.
- Duplicate scenario davranışı deterministik ve belgelenmiş olur.
- Generated import’lar için doğru component/export bilgisi IR’de güvenilir biçimde bulunur.

---

### Faz 2 — React Render Contract Modeli

Bu fazın amacı, generated testlerin gerçekten render edilebilir ve çalıştırılabilir hale gelmesidir.

#### Hedefler

- Component props / wrapper / provider ihtiyaçlarını modellemek
- UI testleri için standard render recipe tanımlamak
- React entegrasyonunu “örnek üzerinde çalışıyor” seviyesinden çıkarıp genellenebilir hale getirmek

#### Yapılacaklar

1. **Render recipe sistemi**
   - Component bazlı props tanımı
   - provider/wrapper tanımı
   - router ihtiyacı
   - portal target / modal mounting desteği
   için config tabanlı bir render contract oluştur.

2. **Required props ve wrapper validation**
   - Gerekli props verilmeden generate edilen component testlerini validation aşamasında yakala.
   - Missing provider / router risklerini warning veya error olarak raporla.

3. **Generator entegrasyonu**
   - Vitest generator’ı render recipe’ye göre `render(...)` üretir hale getir.
   - Gerekirse yardımcı test harness dosyaları üret.

4. **Reference integration fixtures**
   - Modal
   - form
   - provider gerektiren component
   - router bağımlı component
   için ayrı örnek fixture’lar ekle.

#### Çıkış Kriterleri

- Props isteyen componentler generated testte patlamaz.
- Router/provider gerektiren örnekler recipe ile düzgün mount edilir.
- Example app ve referans fixture’lar generated Vitest compile smoke testini geçer.

---

### Faz 3 — Test Generation Güvenilirliği

Bu fazın odağı, generated output’un sadece okunur değil, **gerçekten güvenilir ve executable** olmasıdır.

#### Hedefler

- Async UI akışlarını doğru üretmek
- Import path ve locator stratejilerini daha güvenilir hale getirmek
- Generated dosyaların type-check / smoke run aşamasından geçmesini sağlamak

#### Yapılacaklar

1. **Async-aware generation**
   - `waitFor`, `findBy*`, route readiness ve loading-to-success geçişleri için açık üretim stratejileri ekle.
   - Senkron ve asenkron expectation türlerini ayır.

2. **Import path güvenilirliği**
   - Relative import üretimi
   - alias-aware resolver
   - config tabanlı import override
   için generator desteği ekle.

3. **Playwright gerçekçiliği**
   - Route readiness
   - selector stabilitesi
   - context’e uygun navigation davranışı
   için daha güçlü kurallar tanımla.

4. **Smoke suite**
   - Generated Vitest dosyaları için type-check / compile smoke testi ekle.
   - Selected generated Playwright spec’leri için smoke run kur.

#### Çıkış Kriterleri

- Generated Vitest dosyaları type-check geçer.
- Async örneklerde flaky olmayan çıktı üretilir.
- Playwright generate çıktısı example app üzerinde anlamlı smoke seviyesinde doğrulanır.

---

### Faz 4 — Validation DX 2.0

Bu fazda amaç yalnızca syntax denetimi değil, **semantik riskleri generate öncesinde yakalamak** olacaktır.

#### Hedefler

- Validation’ı syntax katmanından semantik rehber katmanına taşımak
- Rule set’i production senaryolarını kapsayacak biçimde genişletmek
- CLI, CI ve IDE tarafında daha iyi diagnostics sağlamak

#### Yapılacaklar

1. **Semantic rule set**
   - duplicate scenario collision
   - mutually exclusive branch merge riski
   - unresolved export/component mapping
   - missing render recipe
   - route mismatch
   - async expectation risk
   için yeni rule’lar ekle.

2. **Severity ve strict mode**
   - `error`, `warning`, `info` seviyelerini daha netleştir.
   - `--strict` davranışını semantik rule’larla uyumlu hale getir.

3. **Diagnostics kalitesi**
   - suggestion alanını sistematikleştir.
   - JSON çıktısına şema versiyonu ekle.
   - Rule reference dokümanı üret.

4. **Validation fixture matrisi**
   - Her rule için fixture bazlı test ekle.
   - Hidden test mantığına dayanıklı boundary case’leri kapsa.

#### Çıkış Kriterleri

- “Generate olur ama mantıksal olarak riskli” durumların çoğu validation aşamasında yakalanır.
- CI için kararlı JSON diagnostics yüzeyi oluşur.
- Kullanıcı yalnızca hata değil, çözüm önerisi de görür.

---

### Faz 5 — Gerçek Entegrasyon ve CI Productization

Bu fazın amacı, çekirdeğin her PR’da gerçek kullanım üstünden doğrulanmasıdır.

#### Hedefler

- Example app’i canlı regression playground’a çevirmek
- Generated output’u CI seviyesinde sürekli doğrulamak
- Docs örneklerini canlı fixture çıktılarıyla eşlemek

#### Yapılacaklar

1. **Example app CI hattı**
   - build
   - generate
   - validate
   - generated Vitest smoke
   - generated Playwright smoke
   adımlarını tek pipeline altında çalıştır.

2. **Golden integration fixtures**
   - form app
   - modal app
   - async search app
   - nested context app
   - provider/router app
   gibi fixture paketleri ekle.

3. **Artifact ve regression takibi**
   - Generated output diff’lerini artifact olarak sakla.
   - Bilinen bug sınıfları için regression mapping oluştur.

4. **Docs senkronizasyonu**
   - Docs örneklerini statik el yazımı yerine gerçek fixture çıktılarıyla güncelle.

#### Çıkış Kriterleri

- Her PR’da gerçek integration doğrulaması yapılır.
- Example app yalnızca demo değil, regression garantisi taşıyan bir referans projeye dönüşür.
- Docs ile gerçek output arasında drift minimuma iner.

---

### Faz 6 — Kapsamı Kontrollü Genişletme

Bu faza yalnızca Faz 1–5 çıkış kriterleri sağlandıktan sonra geçilmelidir.

#### Hedefler

- Sağlam React çekirdeği bozulmadan yeni UI etkileşimleri ve framework adapter’ları eklemek
- Genişlemeyi çekirdek semantik ve validation modelini koruyarak yapmak

#### Yapılacaklar

1. **Zengin UI action set**
   - keyboard combos
   - drag/drop
   - file upload
   - focus/tab navigation
   - hover-driven menu akışları

2. **Accessibility-first genişleme**
   - dialog lifecycle
   - focus trap
   - accessible name
   - keyboard accessibility
   tarafında ek kural ve generator desteği ver.

3. **Framework adapter contract**
   - React parser’ını ortak adapter arayüzüne taşı.
   - Vue için `@vue/compiler-sfc`
   - Svelte için `svelte/compiler`
   tabanlı parity adapter’lar geliştir.

4. **Framework config deneyimi**
   - Dosya pattern’ine göre parser seçimi
   - monorepo override
   - mixed-framework repo senaryoları
   için configuration surface tasarla.

#### Çıkış Kriterleri

- React, Vue ve Svelte için aynı IR sözleşmesi korunur.
- Yeni etkileşim türleri mevcut React akışını bozmaz.
- Framework genişlemesi çekirdekte yeni kırılganlıklar üretmez.

---

## 6.4. UI ve Test Backlog Özeti

### 6.4.1. UI Modelleme Backlog’u

- branch/state tagging modeli
- scenario variant naming kuralı
- component/export ownership
- props/harness contract
- router/provider recipe desteği
- modal/portal handling
- accessibility interaction coverage
- async state transition modeling

### 6.4.2. Test Altyapısı Backlog’u

- generated Vitest compile smoke
- generated Playwright smoke run
- golden output fixture matrisi
- semantic validation regression suite
- CLI end-to-end fixture testleri
- example-app CI pipeline
- flaky async detection senaryoları

---

## 6.5. Çapraz İş Akışları

Her faz boyunca paralel ilerlemesi gereken bazı sürekli işler vardır.

### 6.5.1. Dokümantasyon Eşleşmesi

- README, docs ve gerçek kod durumu birbiriyle uyumlu kalmalıdır.
- “Planned” ve “available today” net biçimde ayrılmalıdır.
- Örnek çıktılar, gerçekten üretilen output ile güncel tutulmalıdır.

### 6.5.2. Test ve Güvenilirlik

- Her yeni rule veya generator davranışı test ile gelmelidir.
- Regression testi eklenmeden parser/generator davranışı değiştirilmemelidir.
- Boundary case’ler ve gizli test mantığı göz önünde tutulmalıdır.

### 6.5.3. Geliştirici Deneyimi

- CLI çıktıları kısa ama açıklayıcı kalmalıdır.
- Hata mesajları satır bilgisi ve çözüm önerisi taşımalıdır.
- Varsayılan config, ilk kullanımda mümkün olduğunca az sürtünme üretmelidir.

---

## 6.6. Riskler ve Karar Notları

### 6.6.1. UI Semantiği Oturmadan Genişleme

Risk:

- Branch/state modelleme çözülmeden yeni framework desteğine geçmek, yanlış IR davranışını çoğaltır.

Karar:

- Önce React çekirdeğinde doğru UI semantiği garanti altına alınacak.

### 6.6.2. Render Contract Eksikliği

Risk:

- Generated testler compile olsa bile props/provider eksikliği nedeniyle gerçek koşuda patlayabilir.

Karar:

- Render recipe sistemi, production-ready olmanın zorunlu parçası kabul edilecek.

### 6.6.3. Semantik Validation’ın Gecikmesi

Risk:

- Kullanıcı mantıksal hataları ancak generated test kırıldığında görürse araca güven kaybı yaşar.

Karar:

- `validate`, uzun vadede `generate` kadar önemli bir birincil komut olarak ele alınacak.

### 6.6.4. Çalışmayan Ama Güzel Görünen Output

Risk:

- Teknik olarak üretilen ama executable olmayan output, ürünün benimsenmesini düşürür.

Karar:

- Output kalitesi ve executable smoke testi birlikte ele alınacak; biri diğerinin yerine geçmeyecek.

---

## 6.7. Başarı Kriterleri

1. **UI Semantiği Güvenilirliği**
   - React parser + IR akışı branch/state ayrımlarını deterministik ve doğru biçimde temsil etmeli.

2. **React Entegrasyon Güvenilirliği**
   - Generated testler props/provider/router ihtiyaçlarıyla birlikte render edilebilir olmalı.

3. **Generated Test Güveni**
   - Generated dosyalar type-check geçmeli ve selected smoke koşuları başarıyla tamamlamalı.

4. **Validation Kalitesi**
   - Kullanıcı, invalid veya semantik olarak riskli DSL’i generate aşamasından önce net şekilde anlayabilmeli.

5. **CI ve Ürünleşme**
   - Example app ve golden fixture’lar CI’da sürekli doğrulanmalı.

6. **Kontrollü Genişleme**
   - Vue/Svelte ve zengin UI etkileşimleri, React çekirdeğinin kararlılığını düşürmeden eklenmeli.

---

## 6.8. Sonuç

Bu planın ana ilkesi şudur:

> **Önce güven, sonra genişleme.**

TestWeaver’ın production-ready hale gelmesi, desteklenen framework sayısını artırmaktan çok; UI davranışını doğru modelleyen, generated testine güven duyulan ve CI tarafından sürekli doğrulanan bir React çekirdeği oluşturmaktan geçer. Bu temel sağlamlaştıkça validation, output kalitesi ve yeni framework desteği çok daha güvenli ve sürdürülebilir biçimde büyütülebilir.
