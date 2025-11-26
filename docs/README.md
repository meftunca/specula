# TestWeaver Dokümantasyonu

Bu websitesi [Docusaurus](https://docusaurus.io/) kullanılarak oluşturulmuştur.

## Kurulum

```bash
cd docs
npm install
```

## Yerel Geliştirme

```bash
npm start
```

Bu komut yerel bir geliştirme sunucusu başlatır ve bir tarayıcı penceresi açar. Değişikliklerin çoğu sunucuyu yeniden başlatmadan otomatik olarak yansıtılır.

## Build (Derleme)

```bash
npm run build
```

Bu komut `build` dizinine statik içerik oluşturur ve herhangi bir statik içerik barındırma servisi ile sunulabilir.

## Deployment (Yayınlama)

### GitHub Pages

SSH ile:

```bash
USE_SSH=true npm run deploy
```

SSH olmadan:

```bash
GIT_USER=<GitHub kullanıcı adınız> npm run deploy
```

### Netlify

1. Netlify'da yeni bir site oluşturun
2. Git reposunu bağlayın
3. Build ayarları:
   - **Base directory**: `docs`
   - **Build command**: `npm run build`
   - **Publish directory**: `docs/build`

### Vercel

1. Vercel'de yeni bir proje oluşturun
2. Git reposunu bağlayın
3. Framework preset: `Docusaurus 2`
4. Root directory: `docs`

## Dokümantasyon Yapısı

```
docs/
├── docs/                 # Markdown dokümantasyon dosyaları
│   ├── intro.md         # Sistem Genel Bakışı
│   ├── dsl-spec.md      # DSL Spesifikasyonu
│   ├── ir-spec.md       # IR Spesifikasyonu
│   ├── generators-spec.md # Generator Spesifikasyonu
│   ├── cli-spec.md      # CLI Aracı Spesifikasyonu
│   └── implementation-plan.md # Uygulama Planı
├── src/
│   ├── css/             # Özel stiller
│   └── pages/           # Özel sayfalar
├── static/              # Statik dosyalar (resimler, vb.)
├── docusaurus.config.js # Docusaurus yapılandırması
└── sidebars.js          # Kenar çubuğu yapılandırması
```

## Özellikler

- 🇹🇷 **Türkçe**: Tüm dokümantasyon Türkçe olarak yazılmıştır
- 🔍 **Arama**: Yerleşik arama fonksiyonu ile kolay navigasyon
- 🌙 **Karanlık Mod**: Otomatik karanlık/aydınlık mod desteği
- 📱 **Responsive**: Mobil uyumlu tasarım
- 📖 **Markdown**: Kolay düzenleme için standart Markdown formatı
