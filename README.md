# Farming

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

Gelir sipariş teslimatından gelir; üretim doğrudan para kazandırmaz. Üst menüdeki Siparişler bağlantısı ayrı sipariş panosunu açar; rozet bekleyen teklif sayısını gösterir. İlk saha kurulduktan sonra ilk gün 12–15 teklif oluşur; her iki günde sayı iki artarak 19. günden itibaren 30–33 olur. Her panoda kolay, orta ve zor teklifler vardır; zorluk filtreleriyle seçilebilir. Temel miktarlar her gün ilk gün değerinin %8'i kadar artar, her beş günde istenen ürün çeşitliliği yükselir. Kolay ve orta siparişler mevcut depo kapasitesini aşmaz; zor siparişler depo yatırımı gerektirebilir. Aynı gün yeniden teklif üretilemez; kayıt yüklemek, panoyu açmak veya teklifleri bitirmek panoyu doldurmaz. Gün değişince kabul edilmemiş teklifler yenilenir; devam eden sipariş korunur. Eski kayıtların panosu bu sürüme ilk geçişte bir kez yenilenir. Sabaha geçmek de aynı gün kuralını uygular.

Üretim hedefi − / + düğmeleriyle veya aralarındaki sayıya yazılarak değiştirilebilir. Enter ya da alan dışına tıklama değeri uygular; kapasiteyi aşan giriş kalan boş kapasiteye indirilir. Boş ve geçersiz girişler hedefi değiştirmez; sıfır hedefi iptal eder. Üst envanter ürün çeşidi ve toplam stok özeti gösterir; açıldığında ürünler yatay kaydırma yerine satırlara dağıtılır.

Her günlük panoda en az bir yatırım siparişi bulunur. Bu siparişler yeni saha açılmasını ve mevcut depo kapasitesinin üzerinde teslimat miktarlarıyla depo büyütülmesini gerektirebilir; süreleri 360–540 saniyedir ve birim teklif değeri standart siparişlerden yüksektir. Detaylarda stok açığı, gereken saha ve depo kapasitesi gösterilir. Oyuncu hazırlığını yapıp aynı anda bir sipariş kabul edebilir; süre kabul edilince başlar, bekleyen teklifler için işlemez.

Sürenin ilk %80'inde teslim %20 bonus kazandırır; kalan sürede normal teklif bedeli ödenir. Son anda yeterli stok varsa otomatik normal teslim yapılır. Gecikme ilgili tüccarın güvenini 10 puan düşürür; 30 saniyelik ek sürede de teslim edilmezse 10 puan daha düşer. Vazgeçmek 10 puan kaybettirir. Para cezası yoktur. Her tüccarın güveni 100'den başlar; yeni teklif bedelleri güven 100'de %100, güven 0'da %50 olacak şekilde azalır. Kabul edilen fiyat sabittir. Güven kaybında aynı tüccarın havuzdaki eski teklifi kaldırılır. Eski otomatik siparişler kayıttan yüklenirken seçilebilir teklife dönüşür.

İşçiler 08:00–20:00 arasında çalışır. Her gerçek saniye bir oyun dakikasıdır. Duraklatma tüm simülasyon sayaçlarını durdurur. Mesai dışında sabaha geçilebilir; açık sipariş sonuçlandırılır ve gün değişiyorsa günlük ücret ödenir. Ücret kişi başına güncel işe alım maliyetinin %10'udur. Hastalık, ekipmansızlık nedeniyle istifa ve barınak kuralları uygulanır; barınaksız işçiler çalışamaz.

## Kayıt ve doğrulama

Oyun `last-city-workers-v2` anahtarıyla tarayıcıya kaydedilir; çevrimdışı üretim yoktur. Yeni oyun kaydı sıfırlar. Eski kayıtlardaki para, stok ve işçiler korunur; yeni katalogda karşılığı olan açılmış sahalar ve başlangıç ekipmanları aktarılır. Katalogda karşılığı olmayan görevlerin işçileri boşa alınır; eski ürün stokları korunur.

`npm test` oyun kuralları ve DOM üzerinden kullanıcı akışlarını, `npm run build` TypeScript ve üretim derlemesini doğrular. ESLint yapılandırması henüz bulunmaz.

Hastane ana kategoridedir. İlk seviye 2 doktor kapasitesi verir; her seviye +2 kapasite ekler. Doktor 50₺ karşılığında alınır ve 2 hastaya bakar. Hastalık 600 saniye, kesintisiz tedavi 300 saniye sürer. Her tedavi 1 iğne, 1 ağrı kesici ve 1 antibiyotik tüketir; eksikleri hastane müdürü bildirir. Hastalık başına ölüm olasılığı %1’dir. Ekipmansız geçirilen 600 mesai saniyesi istifaya yol açar; ekipman sağlanınca sayaç sıfırlanır. Dinlenme ve hastalık süreleri istifa sayacını ilerletmez. Sabaha geçmek gerçek süre sayaçlarını ilerletmez.

## Windows ve aynı ağda çok oyunculu oyun

Windows 64 bit: `artifacts/windows/Farming-Kurulum.exe`. Bir kez kurun, ardından masaüstündeki Farming kısayolunu kullanın. Kurulumsuz çalıştırmak için `artifacts/windows/win-unpacked/Farming.exe` açılabilir; klasördeki diğer dosyalar birlikte tutulmalıdır. Eski tek dosyalık `Farming.exe` önceki sürümdür. Yeniden üretmek için `EXE-Olustur.bat` dosyasına çift tıklayın veya `npm run desktop:exe` çalıştırın. Yeni paket maksimum sıkıştırma ve Türkçe/İngilizce arayüz kaynaklarıyla hazırlanır; kurulu uygulama açılışta geçici klasöre paket açmaz.

1. Bir bilgisayarda Farming'i açın. **Multiplayer** bölümünde oyuncu adını ve isteğe bağlı oda adını yazıp **Oda kur** düğmesine basın.
2. Diğer bilgisayarlar ve Android telefonlar aynı Wi-Fi/yerel ağa bağlansın. **Multiplayer → Açık odalar** listesinden odayı seçip ev sahibinin paylaştığı **katılım koduyla** katılsınlar. Liste otomatik yenilenir; **Listeyi yenile** ile de arama yapılabilir.
3. Her oyuncunun ayrı çiftliği, parası, saati ve işçileri vardır. **Oyuncu pazarı** bölümünde stoktan satış ilanı açılır; diğer oyuncu ilandaki miktarın tamamını belirtilen toplam ücretle alır.

Odayı Windows EXE açar; APK odalara katılır. İnternet veya hesap gerekmez. Oda sahibi bilgisayar açık kalmalıdır. Windows güvenlik duvarı sorarsa özel ağ erişimine izin verin. Odalar yerel ağ yayınıyla otomatik bulunur; bağlantı bilgilerini oyuncuların bulması veya yazması gerekmez. Misafir Wi-Fi veya cihaz yalıtımı oda bulmayı engelleyebilir. Bu özellik için hem EXE hem APK 1.2 sürümüne güncellenmelidir.

Tek oyunculu kayıt korunur. İlk ağ katılımında ayrı çiftlik açılır; çevrim içi çiftlikler ev sahibinin `%APPDATA%/Farming/lan-room.json` dosyasında saklanır. Aynı cihaz ve oyuncu adıyla aynı odaya dönünce çiftliğe dönülür. Kayıtlar kalıcı oda kimliğine bağlıdır; ağ adresi değişse de korunur. Uygulama verilerini temizlemek oyuncu anahtarını siler. Önceki sürümdeki kayıtlar ilk katılımda eski bağlantı bilgisi eşleşiyorsa yeni oda kimliğine aktarılır. Bağlı olmayan oyuncunun üretimi durur; açık satış ilanları satın alınabilir. Oda yeniden açıldığında kayıtlar ve ilanlar yüklenir. Oda en fazla 16 oyuncu kaydı tutar.

Alım satım ve oyun komutları sunucuda doğrulanır. Aynı ilan bir kez satılır; bakiye, stok ve depo kontrol edilir. Satış ilanı stok ayırmaz; ürün başka yerde kullanılmışsa satın alma reddedilir. Duraklatma ve sonraki güne geçiş yalnızca kendi çiftliğini etkiler. Çevrim içi çiftlik sıfırlama kapalıdır.

Doğrulama: `npm run test:lan`; Android Java tarayıcısı ile masaüstü oda keşfi: `npm run test:android-discovery`. Gerçek Electron arayüzü ve iki ayrı uygulamayla test: `npm run desktop:prepare` ardından `node scripts/smoke-desktop.mjs`. Paketlenmiş sürüm: `node scripts/smoke-desktop.mjs --packaged`. Java ağ testi ve telefon boyutundaki ekran testi fiziksel Android testi yerine geçmez. Teknik olarak oyun TCP 4765, otomatik oda keşfi UDP 4766 kullanır; katılım kodu keşif yanıtlarında yayınlanmaz.

## APK üretme kısayolu

`APK-Olustur.bat` dosyasına çift tıklayın. Güncel oyun derlenir ve APK konumu açılır: `artifacts/Farming.apk` (debug). Terminal: `npm run android:apk`.

JDK 21 ve Android SDK gereklidir; mevcut yerel araçlar otomatik bulunur. Gradle önbelleği ve artımlı derleme kullanılır, temiz derleme yapılmaz. Web içeriği her çalıştırmada güncellenir. Hata olursa pencere açık kalır.
