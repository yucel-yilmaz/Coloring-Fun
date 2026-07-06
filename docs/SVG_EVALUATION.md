# SVG değerlendirme protokolü

SVG, boyama motorunun zorunlu biçimi değildir. Üretime alınması için en az 50 farklı AI çizgisinde raster dolgu davranışını koruduğu kanıtlanmalıdır.

## Örnek düzeni

`samples/svg-evaluation` içine kaynak ve motor çıktıları aynı kök adla konur:

```text
lion.png
lion.vtracer.svg
lion.potrace.svg
lion.lineart2vector.svg
```

Hayvan, araç, insan, mekân; 3–5, 6–8 ve 9–12 yaş detay seviyeleri; dikey ve yatay sayfalar dengeli temsil edilmelidir.

## Çalıştırma

```bash
npm run svg:evaluate -- samples/svg-evaluation
```

Araç her SVG için şunları ölçer:

- Raster çizgiyle Intersection-over-Union benzerliği
- Kapalı beyaz bölge koruma oranı
- Tahmini dolgu sızıntısı
- SVG path sayısı ve dosya boyutu
- Script, event handler, `foreignObject`, harici URL ve data URI güvenliği

Bir motor ancak 50 veya daha fazla örnekte en az `%95` geçme oranı, en fazla `%5` ortalama dolgu sızıntısı, en az `0.70` çizgi IoU ve en fazla `2000` path koşullarını sağlarsa ürün entegrasyonuna aday olur. Koşullar sağlanmazsa PNG + maske kalıcı biçim olarak korunur.
