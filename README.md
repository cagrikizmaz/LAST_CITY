# KÜLDEN

**Her emek, yeni bir şehir.**

KÜLDEN, kaynak üretimi, işçi yönetimi ve ticaret üzerine kurulu bir tarayıcı oyunudur. Üç işçi ve ilk üretim sahasıyla başla; kasanı büyüt, yeni kaynakları aç ve 100 seviyelik üretim ağını kur.

## Çalıştırma

Node.js 22.12 veya üzeri gerekir.

```sh
npm ci
npm run dev
```

Terminalde gösterilen yerel adresi tarayıcıda aç.

## Nasıl oynanır?

- İlk sahaya boşta duran işçileri ata. Üretim yalnızca stok kazandırır; para sadece sipariş teslimatından gelir.
- Kasadaki para seviye eşiğine ulaştığında yeni sahalar otomatik açılır.
- Yeni işçiler al, ekibini sahalar arasında dağıt ve siparişler için stok biriktir.
- Siparişleri süre içinde teslim et. Süre dolduğunda stok yeterliyse otomatik teslim edilir; yetersizse ödülün yarısı kadar ceza uygulanır ve kasa borca düşebilir.
- İkinci seviyeden itibaren ekip her 30 saniyede gıda tüketir. Erzak eksikliği üretimi yarıya düşürür.
- Grevler ve istifalar üretimi etkiler. Grev 10 dakika sürer; ihtiyaç duyduğunda ücretli yeni işçi alıp atayabilirsin.

## Ekran düzeni

- **Sol:** Envanter; arama, stok filtreleri ve üretim sahasına gitme kısayolları.
- **Orta:** Üretim sahaları; Tüm sahalar, Açık, Üretimde ve Grevde filtreleri. En az 1280 piksel genişlikte satır başına beş kart, sayfa başına 15 saha gösterilir. Dar ekranlarda sütun sayısı azalır.
- **Sağ:** Siparişler, barınak ve erzak planı.
- **Üst:** Kasa, sonraki hedef ve ilerleme bilgisi.

Envanter ürünleri stok miktarına göre azdan çoğa sıralanır. Bir ürüne tıklamak ilgili üretim kartını açar ve odaklar.

## Kayıt

Oyun aynı tarayıcı ve adres için `localStorage` içinde otomatik kaydedilir. İsim değişikliğinden önceki kayıtlarla uyumluluk için `last-city-workers-v2` anahtarı korunur. Tarayıcı verilerini temizlemek kaydı siler; **Yeni oyun** mevcut ilerlemeyi sıfırlar. Üretim oyun açıkken ilerler; çevrimdışı ilerleme hesaplanmaz.

## Geliştirme

React, TypeScript ve Vite kullanılır. Oyun mantığı ve arayüz testleri Vitest ile çalışır.

```sh
npm test         # Oyun mantığı ve arayüz testleri
npm run build   # TypeScript kontrolü ve dist/ çıktısı
npx vite preview # Derlenmiş oyunu yerelde incele
```

`npm run format` Prettier ile biçimlendirme yapar. Mevcut `npm run lint` komutu için henüz ESLint yapılandırması bulunmaz.

## Dosya yapısı

| Yol | İçerik |
| --- | --- |
| `src/App.tsx` | Oyun arayüzü, filtreler, sayfalama ve kayıt |
| `src/game.ts` | Üretim, seviyeler, işçiler, ticaret ve erzak kuralları |
| `src/styles.css` | Görsel tasarım ve farklı ekran boyutları |
| `src/*.test.*` | Oyun ve arayüz testleri |
| `public/assets/` | Oyun görselleri |
| `docs/ORIGINAL_DESIGN_SPEC.md` | İlk tasarım belgesi; tarihsel referanstır, mevcut özelliklerin tamamını yansıtmaz |

`node_modules/` bağımlılıkları ve `dist/` derleme çıktılarıdır. Git dışında tutulurlar. TypeScript kontrolü kök dizine JavaScript, bildirim veya önbellek dosyası üretmez.

### Barınak

Başlangıçta 3 kişilik barınak bulunur. Her yeni barınak 3 yatak ekler; bedeli ilk yapımda 30₺, ardından her yapımda 30₺ artar. Barınaksız işçiler göreve atanamaz ve üretim yapamaz. Boşta ve grevdeki işçiler de yatak kullanır. Eski kayıtlara mevcut ekibe yetecek kapasite eklenir.

### Sipariş ekonomisi

İlk sipariş 15 saniyede gelir. Bir sipariş teslim edildiğinde veya süresi dolduğunda sonraki sipariş 15–25 saniye içinde gelir. Erken teslimat, yeni siparişi daha erken almanı sağlar. Ödül, istenen ürünlerin toplam birim değerinin iki katıdır. Üretim kasaya para eklemez.

Siparişler en fazla 6 ürün türü içerir; çeşit sayısı barınan ve grevde olmayan işçi sayısını aşmaz. Miktar artışı ekip büyüklüğüne göre sınırlıdır ve hiçbir ürün kendi depo kapasitesini aşacak miktarda istenmez. Fazla stok siparişle eritilebilir. Teslim süresi stok açığı ve ekibe göre hesaplanır (60–240 saniye); erzak ve yavaş üretim için pay bırakılır. Mevcut yarım ödül cezası korunur.

Depo dolduğunda yalnızca ilgili ürünün üretimi durur. Teslimat, tüketim veya depo yükseltmesiyle yer açılınca üretim devam eder. Eski kayıtlardaki para, stok ve aktif sipariş korunur; sonraki sipariş beklemesi kısalır.
