# KÜLDEN

Kaynak üretimi, işçi yönetimi ve ticaret oyunu.

## Çalıştırma

```sh
npm ci
npm run dev
npm test
npm run build
```

## Üretim kategorileri

- Orman: Oduncu, Avcı.
- Tarım: Tarla, Bahçe.
- Hayvancılık: İnek Ahırı, Kümes, Koyun Ağılı.
- Maden: Kömür, Bakır, Kil, Kum, Altın, Gümüş, Taş, Demir.

Kategori kartlarında ürün stokları, çalışan saha sayısı, eksik ekipman ve hammadde özetleri görünür. Kategoriye, ardından sahaya tıklayarak detay ekranını aç. Saatin yanındaki küçük kaynak simgeleri stokları gösterir ve ilgili sahaya kısayol sağlar. Sahada işçi, ekipman, ürün bazında üretim hedefleri ve sağ alttaki depo doluluk grafikleri yönetilir. Sağ alttaki asistan portreleri ihtiyaç sayısını bildirir; tıklayınca ilgili sorumlu açılır pencerede ihtiyaçlarını anlatır ve ekipman satın almayı sağlar. Escape ile kapatılabilir.

## Ekonomi ve ekipman

Yeni oyun 250₺, üç işçi ve üç yatakla başlar. Hiçbir saha otomatik açılmaz. İlk saha 100₺; sonraki satın alımlar kategoriden bağımsız olarak 200₺, 400₺, 800₺ şeklinde ilerler. Saha yükseltmesi bu satın alma fiyatını etkilemez.

Her işçi, sahaya özel tam ekipman setine ihtiyaç duyar. Örneğin oduncuda balta ve eldiven, kömür madeninde kazma, eldiven, el arabası ve baret gerekir. Ekipmanlar sahalar arasında paylaşılmaz. Müdür, mevcut işçi sayısına göre eksikleri bildirir; boş sahada en az bir set ister. Yeni işçi atamadan önce ek set satın alınabilir.

Ekipmanın başlangıç dayanıklılığı 100'dür. Her tamamlanan ürün, kullanılan ekipmanı `1 / ekipman seviyesi` kadar aşındırır. Kırık ekipman çalışmaz ve yükseltilemez; yenisi alınır. Kırılmadan yükseltmek seviyeyi artırır ve dayanıklılığı 100'e yeniler. Tam setin en düşük seviyesi üretim hızını belirler. Ekipman en fazla seviye 10'a yükselir.

## Saha ve depo

Saha seviye 1'de üç işçi kapasitesine sahiptir; her seviye üç işçi daha sağlar. Oduncu ve madenlerde başlangıç rezervi 100 birimdir. Rezerv bitince üretim durur; yükseltme yeni seviyenin `100 × seviye` rezervini açar. Saha yükseltmeleri 50₺'den başlar ve her seviyede iki katına çıkar; üst sınır seviye 20'dir.

Hammadde gerektirmeyen ürünler, ekipmanlı işçi ve depoda yer oldukça sürekli üretilir. İnek ahırında süt, koyun ağılında yün ve koyun sütü otomatik üretilir. İşlenen ürünlerin altında − / adet / + kontrolü bulunur; sayı kalan üretim hedefidir, tamamlandıkça azalır. Toplam bekleyen hedef kapasitesi `100 × saha seviyesi` adettir.

- 2 süt → 1 kaymak.
- 3 süt → 1 tereyağı.
- 2 süt + 1 tereyağı → 1 peynir.
- 2 koyun sütü → 1 koyun peyniri.
- Süt, koyun sütü ve yün için hammadde ve üretim talimatı gerekmez.

Ürünler bağımsız üretim çubuklarıyla eş zamanlı ilerler; biri diğerinin bitmesini beklemez. Çalışabilir ekip her aktif ürün hattının ilerlemesine katkı verir; ekipman her tamamlanan ürün için aşınır. Hammadde eksikse veya çıktı deposu doluysa yalnızca o ürün bekler. Her ürün için seçilen miktarın toplam hammadde açığı güncel stoktan hesaplanıp kırmızı gösterilir. Diğer ürünlerle ortak kullanılan hammaddeler tamamlanma anında tekrar kontrol edilir ve stok eksiye düşmez. Miktarı sıfıra indirmek hedefi ve o ürünün kısmi ilerlemesini iptal eder. Hammaddeler yalnızca ürün tamamlanınca tüketilir. Her ürünün deposu 100 kapasiteyle başlar; depo yükseltmesi mevcut kapasite kadar para karşılığında +100 yer açar. Ürün ilerlemeleri kaydedilir; eski kayıtlardaki süt/yün üretim talimatları sürekli üretime dönüştürülür.

## Ticaret ve işçiler

Gelir sipariş teslimatından gelir; üretim doğrudan para kazandırmaz. Siparişler yalnızca satın alınmış sahaların ürünlerini ister. İlk saha alınmadan sipariş oluşmaz. Sipariş süresi bittiğinde stok yeterliyse teslim edilir, eksikse ödülün yarısı ceza kesilir. Yeni siparişler 15–25 saniye arayla gelir.

İşçiler 08:00–20:00 arasında çalışır. Her gerçek saniye bir oyun dakikasıdır. Duraklatma tüm simülasyon sayaçlarını durdurur. Mesai dışında sabaha geçilebilir; açık sipariş sonuçlandırılır ve gün değişiyorsa günlük ücret ödenir. Ücret kişi başına güncel işe alım maliyetinin %10'udur. Grev, istifa ve barınak kuralları korunur; barınaksız işçiler çalışamaz.

## Kayıt ve doğrulama

Oyun `last-city-workers-v2` anahtarıyla tarayıcıya kaydedilir; çevrimdışı üretim yoktur. Yeni oyun kaydı sıfırlar. Eski kayıtlardaki para, stok ve işçiler korunur; yeni katalogda karşılığı olan açılmış sahalar ve başlangıç ekipmanları aktarılır. Katalogda karşılığı olmayan görevlerin işçileri boşa alınır; eski ürün stokları korunur.

`npm test` oyun kuralları ve DOM üzerinden kullanıcı akışlarını, `npm run build` TypeScript ve üretim derlemesini doğrular. ESLint yapılandırması henüz bulunmaz.
