# Katkıda bulunma

Coloring Fun'a katkıda bulunmayı düşündüğünüz için teşekkürler.

## Başlamadan önce

- Büyük özellikler ve davranış değişiklikleri için önce bir issue açın.
- Güvenlik açıklarını herkese açık issue olarak bildirmeyin; `SECURITY.md`
  içindeki özel bildirim yolunu kullanın.
- Görsel veya model çıktısı eklerken kullanım iznini ve kaynağını belgeleyin.

## Geliştirme akışı

1. Depoyu fork edin ve değişikliğiniz için kısa isimli bir branch açın.
2. `npm ci` ile kilit dosyasındaki bağımlılıkları kurun.
3. `.env.example` dosyasını `.env.local` olarak kopyalayın; gerçek anahtarları
   asla commit etmeyin.
4. Değişikliği mevcut mimari ve kod stiliyle uyumlu, dar kapsamlı tutun.
5. Davranış değişiyorsa ilgili testi ekleyin veya güncelleyin.
6. Göndermeden önce doğrulama komutlarını çalıştırın.

```bash
npm run lint
npm test
npm run build
```

## Commit ve pull request

- Commit mesajlarında `feat:`, `fix:`, `docs:`, `test:`, `refactor:` gibi kısa
  ve açıklayıcı bir tür kullanın.
- Pull request açıklamasında problemi, çözümü ve doğrulama adımlarını yazın.
- UI değişikliklerinde mümkünse önce/sonra ekran görüntüsü ekleyin.
- İlgisiz dosya biçimlendirmelerini aynı pull request'e karıştırmayın.

Bir katkının kabul edilmesi, proje sahibinin o katkıyı depo ile aynı koşullarda
kullanabilmesine izin verdiğiniz anlamına gelir. Açık kaynak lisansı seçilene
kadar katkıların birleştirilmesi proje sahibinin değerlendirmesine tabidir.
