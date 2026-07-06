# Coloring Fun

Ebeveyn kontrollü boyama uygulaması. Hazır çizimler üyelik olmadan boyanabilir; üyeler Gemini, OpenAI veya yerel SDXL ile yaşa uygun boyama sayfaları üretebilir, özel galeride saklayabilir ve admin onayıyla topluluğa paylaşabilir.

## Yerel kurulum

```bash
npm install
cp .env.example .env.local
npm run dev
```

Uygulama `http://localhost:3000` adresinde açılır. Supabase ayarları olmadan hazır katalog ve boyama ekranı çalışır; üyelik ve AI özellikleri yapılandırma uyarısı gösterir.

## Supabase kurulumu

1. Yeni bir Supabase projesi oluşturun.
2. `supabase/migrations/202607060001_membership_ai_community.sql` migration dosyasını çalıştırın.
3. Supabase Auth içinde e-posta/şifreyi ve Google provider'ını etkinleştirin.
4. Site URL ve OAuth callback URL değerlerini uygulama alan adınıza ayarlayın.
5. `.env.local` dosyasına `.env.example` içindeki public ve backend değerlerini girin.
6. `AI_KEYS_MASTER_KEY` üretmek için `openssl rand -hex 32` kullanın ve değeri prodüksiyonda Secret Manager'a koyun.
7. `OPENAI_MODERATION_API_KEY` için platforma ait, kullanıcı üretim anahtarlarından ayrı bir OpenAI anahtarı kullanın.

`SUPABASE_SECRET_KEY`, `AI_KEYS_MASTER_KEY` ve moderasyon anahtarı hiçbir zaman `VITE_` önekiyle tanımlanmamalıdır.

### Yerel Supabase

Docker açıkken:

```bash
npm run supabase:start
npm run dev
```

Yerel API `http://127.0.0.1:54321`, PostgreSQL ise `127.0.0.1:54322` üzerinde çalışır. `.env.local` bu proje için yerel anahtarlarla hazırlanmıştır.

Yerel admin hesabı yalnızca geliştirme içindir:

```text
E-posta: admin@coloring.fun
Şifre: LocalAdmin123!
```

Auth, admin bootstrap, API/RLS, private Storage ve skill seed doğrulaması:

```bash
npm run dev
# Başka bir terminalde:
npm run verify:supabase
```

Servisleri görmek veya durdurmak için `npm run supabase:status` ve `npm run supabase:stop` kullanılabilir. Google OAuth varsayılan olarak kapalıdır; Google Cloud istemci bilgileri Supabase Auth'a eklendikten sonra `VITE_GOOGLE_AUTH_ENABLED=true` yapılmalıdır.

## Çalıştırma

```bash
npm run dev          # Web + API
npm run worker       # AI üretim işçisi
npm run cleanup      # 7/90/365 günlük saklama kurallarını uygula
npm run svg:evaluate -- samples/svg-evaluation # SVG motorlarını ölç
npm run lint         # TypeScript
npm test             # Birim ve API testleri
npm run build        # Web, API ve worker production build
```

### Apple Silicon yerel görsel üretimi

M4/16 GB kurulumu SDXL Base, SDXL-Lightning 4-step, ColoringBookRedmond ve
FP16-safe SDXL VAE kullanır. Büyük model dosyaları varsayılan olarak
`/Volumes/YEDEK/Coloring-Fun-AI` altında tutulur.

```bash
npm run local-ai:setup # Yalnızca ilk kurulumda
npm run local-ai:start
npm run worker
PORT=3002 npm run dev
```

Uygulamada **Yapay zekân → Bu Mac → Bu Mac’e bağlan** seçilir. Yerel servis
yalnızca `127.0.0.1:7861` adresini dinler ve API anahtarı istemez. 16 GB birleşik
bellekte MPS kararlılığı için her üretim izole bir alt süreçte çalışır.

Prodüksiyonda `dist/server.cjs` web/API servisi, `dist/worker.cjs` ise sürekli CPU tahsisli ayrı worker servisi olarak çalıştırılır. `dist/cleanup.cjs` günde bir Cloud Scheduler/Cloud Run Job ile çağrılır.

## Güvenlik modeli

- Çocuklar hesap açmaz; yalnızca ebeveyne bağlı takma ad ve yaş aralığı saklanır.
- Kullanıcı AI anahtarları AES-256-GCM ile şifrelenir ve API cevaplarına geri verilmez.
- Prompt ve görsel çıktısı platform moderasyonundan geçmeden saklanmaz.
- Üretilen içerik varsayılan olarak özeldir.
- Topluluk yayını yalnızca moderator/admin kararıyla oluşur.
- Supabase tabloları ve dosya alanları RLS ile korunur.
- Görsel proxy yalnızca Google çizim hostu ile yapılandırılmış Supabase hostuna izin verir.

## AI skill zinciri

Yedi sürümlü skill birlikte derlenir: boyama üretici, yaş uyarlayıcı, sahne bestecisi, prompt güvenliği, çizgi temizleyici, boyanabilirlik değerlendirici ve meta veri üretici. Kullanıcı ham prompt gönderemez. Admin paneli her skill için taslak sürüm, yayınlama ve geri alma sağlar.

## Tarayıcı smoke testi

Playwright Python paketi ve Chromium kuruluysa:

```bash
npm run build
python3 ~/.agents/skills/webapp-testing/scripts/with_server.py \
  --server "env NODE_ENV=production npm start" --port 3000 \
  -- python3 tests/browser_smoke.py
```
