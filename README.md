# Coloring Fun

Ebeveyn kontrollü, yapay zekâ destekli bir boyama uygulaması. Ziyaretçiler hazır
çizimleri hesap açmadan boyayabilir; üyeler Gemini, OpenAI veya Apple Silicon
üzerinde çalışan yerel SDXL ile yaşa uygun boyama sayfaları üretebilir.

## Özellikler

- Fırça, boya kovası, silgi, geri alma ve galeri desteği olan dokunmatik boyama alanı
- Üyeliksiz kullanılabilen yerel çizim kataloğu
- Ebeveyne bağlı çocuk profilleri ve yaş grupları
- Gemini, OpenAI ve yerel SDXL sağlayıcıları
- Kullanıcıya özel galeri ve moderasyonlu topluluk paylaşımı
- Şifrelenmiş kullanıcı API anahtarları, içerik moderasyonu ve Supabase RLS
- Skill sürümleme, yayınlama ve geri alma araçları içeren yönetim alanı

## Teknolojiler

React 19, TypeScript, Vite, Express, Supabase, Vitest, Sharp ve isteğe bağlı
Python/SDXL kullanılır. Web/API süreci ile AI worker ayrı çalışabilir.

## Gereksinimler

- Node.js 22 veya üzeri
- npm 10 veya üzeri
- Bulut özellikleri için bir Supabase projesi
- Yerel Supabase için Docker
- Yerel SDXL için Apple Silicon, `uv` ve yeterli disk alanı

## Hızlı başlangıç

```bash
git clone https://github.com/yucel-yilmaz/Coloring-Fun.git
cd Coloring-Fun
npm ci
cp .env.example .env.local
npm run dev
```

Uygulama varsayılan olarak <http://localhost:3000> adresinde açılır. Supabase
ayarları olmadan hazır katalog ve boyama ekranı çalışır; üyelik ve AI özellikleri
yapılandırma uyarısı gösterir.

## Yapılandırma

`.env.example` dosyasını `.env.local` olarak kopyalayın. `VITE_` önekli değerler
tarayıcı paketine dahil edilir; gizli değerlerde bu öneki kesinlikle kullanmayın.

| Değişken | Kullanım |
| --- | --- |
| `VITE_SUPABASE_URL` | Tarayıcının bağlanacağı Supabase URL'si |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Tarayıcıda kullanılabilen publishable/anon anahtar |
| `VITE_GOOGLE_AUTH_ENABLED` | Google giriş düğmesini etkinleştirir |
| `SUPABASE_URL` | API ve worker için Supabase URL'si |
| `SUPABASE_PUBLIC_URL` | İstemciye dönen Storage URL'lerinin dış adresi |
| `SUPABASE_SECRET_KEY` | Yalnızca sunucuda kullanılan secret/service-role anahtarı |
| `AI_KEYS_MASTER_KEY` | Kullanıcı AI anahtarlarını şifreleyen 32 baytlık hex anahtar |
| `OPENAI_MODERATION_API_KEY` | Platform moderasyonu için ayrı OpenAI anahtarı |
| `ADMIN_EMAILS` | İlk doğrulanmış istekte admin yapılacak e-posta listesi |
| `LOCAL_IMAGE_API_URL` | Yerel görsel servisinin adresi |

Şifreleme anahtarını şu komutla üretebilirsiniz:

```bash
openssl rand -hex 32
```

Gerçek gizli değerleri commit etmeyin. Üretimde GitHub Actions secrets veya bulut
sağlayıcınızın Secret Manager hizmetini kullanın.

## Supabase kurulumu

1. Bir Supabase projesi oluşturun.
2. `supabase/migrations/` altındaki migration dosyalarını sırasıyla uygulayın.
3. Supabase Auth içinde e-posta/şifreyi ve gerekiyorsa Google provider'ını açın.
4. Site URL ve OAuth callback URL değerlerini uygulamanızın adresine ayarlayın.
5. Public ve backend değerlerini `.env.local` dosyasına ekleyin.

Yerel Supabase için Docker çalışırken:

```bash
npm run supabase:start
npm run dev
```

Auth, API/RLS, private Storage, admin bootstrap ve skill seed akışını doğrulamak
için `.env.local` içindeki `ADMIN_EMAILS` ile aynı test hesabını kullanın:

```bash
export TEST_ADMIN_EMAIL="admin@example.test"
export TEST_ADMIN_PASSWORD="yalnizca-yerel-guclu-bir-sifre"
npm run verify:supabase
```

Yerel servisleri `npm run supabase:status` ile görebilir,
`npm run supabase:stop` ile durdurabilirsiniz.

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Web uygulaması ve API'yi geliştirme modunda başlatır |
| `npm run worker` | AI üretim kuyruğu işçisini başlatır |
| `npm run cleanup` | Saklama süreleri dolan verileri temizler |
| `npm run lint` | TypeScript tip kontrolünü çalıştırır |
| `npm test` | Birim ve API testlerini çalıştırır |
| `npm run build` | Web, API, worker ve cleanup çıktılarını üretir |
| `npm run svg:evaluate -- <dizin>` | SVG motoru değerlendirme raporu üretir |

## Yerel SDXL

Yerel görsel üretimi Apple Silicon üzerinde SDXL Base, SDXL-Lightning,
ColoringBookRedmond ve FP16 uyumlu SDXL VAE kullanır. Model ve Python ortamı
varsayılan olarak `~/.cache/coloring-fun-ai` altında saklanır; farklı bir disk
için `LOCAL_AI_HOME` ayarlanabilir.

```bash
export LOCAL_AI_HOME="/path/to/coloring-fun-ai"
npm run local-ai:setup
npm run local-ai:start
```

Ardından ayrı terminallerde worker ve uygulamayı başlatın:

```bash
npm run worker
PORT=3002 npm run dev
```

Varsayılan yerel servis `127.0.0.1:7861` adresini dinler. Eğer ComfyUI
`127.0.0.1:8188` üzerinde çalışıyorsa `.env.local` içine aşağıdaki satırı ekleyin:

```bash
LOCAL_IMAGE_API_URL="http://127.0.0.1:8188"
```

ComfyUI ile üretimde varsayılan checkpoint adı
`sd_xl_base_1.0.safetensors` olarak beklenir. Farklı bir checkpoint için
isteğe bağlı olarak `COMFYUI_CHECKPOINT` tanımlayabilirsiniz.

Ayrıntılar için [`local-ai/README.md`](local-ai/README.md) dosyasına bakın.

## Production

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

`dist/server.cjs` web/API servisini, `dist/worker.cjs` sürekli çalışan worker'ı,
`dist/cleanup.cjs` ise zamanlanmış temizleme görevini içerir. Worker'ı ayrı bir
süreçte `npm run start:worker` ile çalıştırın; cleanup görevini periyodik olarak
`npm run start:cleanup` ile çağırın.

## Güvenlik modeli

- Çocuklar hesap açmaz; ebeveyne bağlı takma ad ve yaş aralığı saklanır.
- Kullanıcı AI anahtarları AES-256-GCM ile şifrelenir ve API cevaplarına dönmez.
- Prompt ve görsel çıktısı moderasyondan geçmeden kalıcı olarak saklanmaz.
- Üretilen içerik varsayılan olarak özeldir.
- Topluluk yayını yalnızca moderator/admin kararıyla oluşur.
- Supabase tabloları ve dosya alanları RLS ile korunur.
- Görsel proxy yalnızca izin verilen HTTPS hostlarına erişir.

Güvenlik açığı bildirmek için [`SECURITY.md`](SECURITY.md) dosyasını izleyin.

## Testler

```bash
npm run lint
npm test
npm run build
```

Tarayıcı smoke testleri Python Playwright ve Chromium gerektirir. Çalışan bir
production sunucusuna karşı örnek:

```bash
BASE_URL=http://127.0.0.1:3000 python3 tests/browser_smoke.py
```

Kimlik doğrulamalı smoke testleri için `TEST_ADMIN_EMAIL` ve
`TEST_ADMIN_PASSWORD` ortam değişkenlerini de sağlayın.

## Katkı ve varlıklar

Katkı süreci için [`CONTRIBUTING.md`](CONTRIBUTING.md) dosyasına bakın. Depodaki
üçüncü taraf görsellerin kullanım koşulları kaynak kodundan ayrıdır ve
[`THIRD_PARTY_ASSETS.md`](THIRD_PARTY_ASSETS.md) içinde açıklanır.

## Lisans

Bu depo için henüz bir açık kaynak lisansı seçilmemiştir. Bir `LICENSE` dosyası
eklenene kadar aksi belirtilmeyen tüm haklar saklıdır.
