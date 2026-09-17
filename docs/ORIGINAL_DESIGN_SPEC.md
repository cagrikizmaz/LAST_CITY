# LAST CITY — CODEX IMPLEMENTATION SPEC

> **Amaç:** Bu belge, Codex veya benzeri bir kodlama ajanının sıfırdan oynanabilir bir browser oyunu üretmesi için hazırlanmıştır.
>
> **Çalışma biçimi:** Bu dosyayı proje köküne `LAST_CITY_CODEX_SPEC.md` adıyla koy. Codex'e:
>
> **"Bu dosyadaki şartnameyi uygula. Çalışan bir MVP oluştur. Eksik noktalarda makul varsayımlar yap. Her aşamada projeyi çalışır durumda tut. Sadece mock ekran üretme; temel oyun döngüsü gerçekten çalışsın."**
>
> komutunu ver.

---

# 1. OYUNUN ADI

## LAST CITY

Post-apokaliptik şehir kurma, keşif, hayatta kalma ve yönetim oyunu.

Oyuncu başlangıçta yaklaşık 40 kişilik küçük bir yerleşimin lideridir.

Amaç yalnızca hayatta kalmak değildir.

Oyuncu:

- yerleşimi büyütür,
- insanları görevlendirir,
- binalar kurar,
- enerji ve su şebekeleri oluşturur,
- keşif ekipleri gönderir,
- yeni bölgeler keşfeder,
- başka topluluklarla karşılaşır,
- ticaret yapar,
- krizleri yönetir,
- teknoloji geliştirir,
- zaman içinde kasaba, şehir ve bölgesel güce dönüşür.

Oyuncu ilerlediğini her aşamada görmelidir.

Temel his:

> "Bu dünya bana hazır verilmedi. Bunu ben kurdum."

---

# 2. OYUNUN ANA PRENSİBİ

LAST CITY bir "bekle ve değerleri izle" oyunu olmayacak.

Oyuncu sürekli karar vermelidir.

Oyuncunun müdahalesi aşağıdaki alanlarda doğrudan sonuç üretmelidir:

- bina yerleşimi,
- çalışan ataması,
- keşif ekibi kurulumu,
- kaynak tüketimi,
- enerji dağıtımı,
- su dağıtımı,
- sağlık yönetimi,
- güvenlik,
- araştırma,
- diplomasi,
- göçmen kabulü,
- kriz kararları.

Her kararın fırsat maliyeti olmalıdır.

Örnek:

- 10 kişiyi tarımdan güvenliğe çekmek güvenliği artırır fakat gıda üretimini düşürür.
- Hastaneye ek enerji vermek ölüm oranını düşürür fakat atölye üretimini durdurabilir.
- Keşif ekibine fazla yakıt vermek menzil kazandırır fakat şehir jeneratör rezervini azaltır.

---

# 3. TEKNOLOJİ YIĞINI

İlk sürüm browser tabanlı yapılacaktır.

## Zorunlu teknoloji

- React
- TypeScript
- Vite
- Zustand veya eşdeğer hafif state management
- CSS Modules veya normal CSS
- LocalStorage save sistemi
- Vitest
- ESLint
- Prettier

## İsteğe bağlı

- React Flow: enerji/su bağlantı görselleştirmesi için
- Recharts: nüfus, stok ve üretim grafikleri için
- Lucide React: ikonlar için

## Kullanılmayacak

İlk MVP'de:

- backend zorunlu değil
- database zorunlu değil
- multiplayer yok
- 3D motor yok
- Unity yok
- Unreal yok

Kod mimarisi ileride backend veya Electron eklenebilecek şekilde modüler tutulmalıdır.

---

# 4. OYUN DÖNGÜSÜ

Bir oyun günü aşağıdaki sırayla işlemelidir:

1. Oyuncu zamanı durdurabilir.
2. Şehir durumunu inceler.
3. Bina inşa eder veya kuyruk oluşturur.
4. Çalışan atamalarını değiştirir.
5. Keşif ekibi gönderir.
6. Olaylara karar verir.
7. Diplomatik aksiyon seçebilir.
8. Zamanı devam ettirir.
9. Günlük simülasyon çalışır.
10. Kaynak üretimi ve tüketimi hesaplanır.
11. Hastalık, moral, ölüm, doğum, yaralanma vb. güncellenir.
12. Keşif ekipleri ilerler.
13. İnşaatlar ilerler.
14. Araştırmalar ilerler.
15. Rastgele veya koşullu olaylar tetiklenir.
16. Günlük günlüğe kaydedilir.
17. Bir sonraki güne geçilir.

Oyuncu zamanı:

- durdurabilmeli,
- 1x,
- 2x,
- 4x

hızlarında çalıştırabilmelidir.

MVP için oyun tick sistemi gerçek zamanlı olabilir.

Öneri:

- 1 oyun günü = 5 gerçek saniye @1x
- 2.5 saniye @2x
- 1.25 saniye @4x

Pause durumunda hiçbir simülasyon ilerlememelidir.

---

# 5. BAŞLANGIÇ DURUMU

Yeni oyunda oyuncuya aşağıdaki başlangıç durumu verilsin.

## Takvim

Başlangıç tarihi:

**1 Ocak 2028**

## Nüfus

Toplam:

**43 kişi**

Yaş grupları:

- çocuk: 6
- yetişkin: 32
- yaşlı: 5

İş gücü:

**28 kişi**

## Başlangıç kaynakları

- Gıda: 900 birim
- Su: 1200 birim
- Yakıt: 500 birim
- İlaç: 120 birim
- Hurda: 400 birim
- İnşaat malzemesi: 300 birim
- Elektrik rezervi kavramı yok; elektrik günlük üretilir
- Moral: 62 / 100
- Güvenlik: 45 / 100
- Sağlık: 70 / 100

## Başlangıç yapıları

- 4 x Barınak
- 1 x Depo
- 1 x Dizel Jeneratör
- 1 x Su Kuyusu
- 1 x Küçük Klinik
- 1 x Basit Atölye

---

# 6. KAYNAKLAR

Aşağıdaki kaynaklar gerçek oyun sistemine bağlı olmalıdır.

## Gıda

Üretim:

- çiftlik
- sera
- av / keşif olayları
- ticaret

Tüketim:

Her kişi günde ortalama:

`1 gıda birimi`

Açlık etkisi:

Gıda sıfır olduğunda:

- sağlık düşer
- moral düşer
- birkaç gün sonra ölüm riski başlar

---

## Su

Her kişi günde:

`1 su birimi`

Su yetersizliği gıdadan daha ağır sonuç vermelidir.

---

## Yakıt

Kullanım alanları:

- dizel jeneratör
- keşif araçları
- bazı üretim binaları
- ısıtma sistemi

---

## İlaç

Klinik ve hastane tedavisinde kullanılır.

İlaç yoksa sağlık personeli olsa bile tedavi verimi düşer.

---

## Hurda

Onarım ve bazı yapılar için kullanılır.

---

## İnşaat Malzemesi

Yeni binalar için kullanılır.

---

# 7. İNSAN SİSTEMİ

Oyunda yalnızca "43 nüfus" yazmayacak.

Her bireyin en azından basit bir karakter kaydı olacak.

Örnek model:

```ts
type Citizen = {
  id: string
  name: string
  age: number
  gender: "male" | "female"
  profession:
    | "unassigned"
    | "farmer"
    | "doctor"
    | "engineer"
    | "guard"
    | "scout"
    | "builder"
    | "worker"
    | "researcher"
  health: number
  morale: number
  skills: {
    medical: number
    engineering: number
    farming: number
    combat: number
    scouting: number
    research: number
  }
  status:
    | "healthy"
    | "sick"
    | "injured"
    | "dead"
    | "expedition"
}
```

MVP'de 43 kişinin tümü oluşturulmalıdır.

İsimler veri dosyasından rastgele oluşturulabilir.

---

# 8. ÖNEMLİ KARAKTERLER

Sistemin sıradan vatandaşlardan bazılarını zaman içinde "önemli karakter" haline getirebilmesi gerekir.

Önemli karakterler için:

- toplam tedavi edilen kişi,
- tamamlanan keşif sayısı,
- savaş/çatışma sayısı,
- şehirde geçirilen gün,
- katkıda bulunduğu projeler

gibi istatistikler tutulmalıdır.

Bir önemli karakter öldüğünde ölüm kartı gösterilmelidir.

Örnek:

> Dr. Selin Aras hayatını kaybetti.
>
> Yerleşime katıldığı gün: Gün 1  
> Yaşadığı gün: 417  
> Tedavi ettiği kişi: 83  
> Katıldığı keşif: 2

MVP'de bu sistem basit tutulabilir.

---

# 9. MESLEK VE İŞ GÜCÜ

Oyuncu iş gücünü doğrudan yönetebilmelidir.

Ana kategoriler:

- Tarım
- Sağlık
- Güvenlik
- İnşaat
- Üretim
- Keşif
- Araştırma
- Elektrik
- Su

UI üzerinde + ve - ile personel atanabilmelidir.

Atanan çalışan sayısı binanın verimini değiştirmelidir.

Örnek:

Bir çiftliğin ideal çalışan sayısı 10 ise:

- 0 çalışan = %0
- 5 çalışan = %50
- 10 çalışan = %100
- 15 çalışan = maksimum %120

Verim lineer olmak zorunda değildir.

---

# 10. ŞEHİR HARİTASI

Ana şehir ekranı kare grid tabanlı olmalıdır.

MVP:

**24 x 24 tile**

Tile tipleri:

- boş arazi
- yol
- bina
- su
- engel

Oyuncu binaları grid üzerine yerleştirebilmelidir.

Bina üzerine tıklayınca detay paneli açılmalıdır.

---

# 11. BİNALAR

MVP'de aşağıdaki binalar mutlaka olmalı.

## Barınak

Kapasite:

10 kişi

Maliyet:

- 25 inşaat malzemesi
- 10 hurda

---

## Depo

Kaynak kapasitesini artırır.

---

## Dizel Jeneratör

Üretim:

40 enerji/gün

Tüketim:

8 yakıt/gün

Çalışan:

2 mühendis/işçi

---

## Su Kuyusu

Üretim:

60 su/gün

Enerji tüketimi:

5

---

## Küçük Klinik

Kapasite:

10 hasta

Enerji tüketimi:

8

Çalışan:

en az 1 doktor

---

## Çiftlik

Gıda üretimi.

Mevsim ve çalışan sayısından etkilenir.

---

## Sera

Enerji tüketir fakat kış koşullarında daha stabil üretim yapar.

---

## Atölye

Hurdayı:

- inşaat malzemesine,
- yedek parçaya

çevirebilir.

MVP'de yalnızca hurda -> inşaat malzemesi dönüşümü yeterlidir.

---

## Gözetleme Kulesi

Güvenlik artışı.

Yakındaki keşif alanlarının ortaya çıkma ihtimalini artırır.

---

## Araştırma Laboratuvarı

Araştırma projelerini çalıştırır.

---

# 12. ELEKTRİK SİSTEMİ

Elektrik yalnızca sayı olmamalıdır.

Her bina enerji talep eder.

Toplam üretim ve tüketim hesaplanmalıdır.

Enerji açığı varsa oyuncu öncelik seçebilmelidir.

Öncelikler:

1. Sağlık
2. Su
3. Isıtma
4. Tarım
5. Üretim
6. Araştırma

Oyuncu bu sıralamayı değiştirebilmelidir.

Elektrik yetmediğinde düşük öncelikli binalar kapanmalıdır.

MVP için fiziksel kablo çizme sistemi zorunlu değildir.

Ancak kod mimarisi ileride node-based power grid eklenebilir şekilde hazırlanmalıdır.

---

# 13. ISITMA

MVP'de basit tutulacaktır.

Yerleşimin günlük "ısı ihtiyacı" olacak.

Soğuk günlerde ihtiyaç artar.

Isıtma için:

- yakıt,
- elektrik

harcanabilir.

Yetersiz ısı:

- sağlık düşüşü
- hastalık olasılığı
- moral düşüşü

üretmelidir.

---

# 14. HASTALIK SİSTEMİ

Her gün hastalık riski hesaplanır.

Riski etkileyenler:

- soğuk
- yetersiz su
- düşük sağlık
- düşük ısı
- kalabalık
- göçmen gelişi
- klinik kapasitesi

Hastalar:

- hafif hasta
- ağır hasta

olabilir.

Tedavi için:

- doktor
- klinik yatağı
- ilaç

gereklidir.

---

# 15. KEŞİF HARİTASI

Şehir haritasından ayrı bir dünya/bölge haritası olmalıdır.

Başlangıçta büyük ölçüde "fog of war" bulunmalıdır.

MVP:

**12 x 12 bölgesel grid**

Merkezde oyuncunun yerleşimi.

Keşfedilmemiş hücreler `???` şeklinde görünmelidir.

Keşif ekipleri belirli hücrelere gönderilebilir.

---

# 16. KEŞİF EKİBİ

Oyuncu keşif ekibi kurabilmelidir.

Bir ekip:

- 1–4 kişi
- araç seçimi
- gıda
- su
- yakıt

ile gönderilir.

Karakterlerin scouting/combat/medical yetenekleri görev sonucunu etkilemelidir.

Örnek:

```ts
type Expedition = {
  id: string
  memberIds: string[]
  targetRegionId: string
  food: number
  water: number
  fuel: number
  status: "traveling" | "exploring" | "returning" | "completed" | "lost"
  daysRemaining: number
}
```

Keşif sonucunda:

- kaynak
- bina
- insan
- düşman
- teknoloji
- başka yerleşim

bulunabilir.

---

# 17. KEŞİF NOKTALARI

MVP'de aşağıdaki POI'ler olmalı:

- Benzinlik
- Hastane
- Market / depo
- Polis karakolu
- Küçük köy
- Fabrika
- Radyo kulesi
- Üniversite

Her POI bir veya daha fazla karar üretmelidir.

---

# 18. KARAR KARTLARI

Örnek:

## Benzinlik

> İstasyonda yaklaşık 300 litre yakıt bulunuyor.
>
> Ancak içeride hareket tespit edildi.

Seçenekler:

### Sessizce yaklaş

- keşif becerisi önemli
- düşük çatışma riski

### Silahlı gir

- combat önemli
- yaralanma riski yüksek

### Geri dön

- risk yok
- kaynak yok

Sonuçlar random değil, ağırlıklı olmalıdır.

Beceriler sonucu anlamlı biçimde değiştirmelidir.

---

# 19. DİĞER YERLEŞİMLER

Oyuncu zaman içinde NPC yerleşimleri keşfeder.

Her yerleşimin:

```ts
type Settlement = {
  id: string
  name: string
  population: number
  relation: number
  food: number
  water: number
  fuel: number
  military: number
  ideology: "cooperative" | "neutral" | "hostile"
  status: "stable" | "struggling" | "critical" | "collapsed"
}
```

verisi olmalıdır.

NPC yerleşimleri kendi stoklarını günlük tüketmelidir.

Yani sonsuz kaynak üreten mağaza gibi davranmamalıdır.

---

# 20. DİPLOMASİ

MVP seçenekleri:

- Ticaret
- Yardım gönder
- Yardım iste
- Göçmen kabul et
- İlişki geliştir

Ticaret gerçek stoktan yapılmalıdır.

Örnek:

Oyuncu:

50 ilaç verir.

NPC:

200 yakıt verir.

İşlemden sonra iki tarafın stokları gerçekten değişmelidir.

---

# 21. GÖÇ

NPC yerleşimi kritik duruma düştüğünde göç olasılığı oluşur.

Örnek olay:

> Northbridge yerleşiminden 27 kişi kapınıza ulaştı.

Seçenek:

- Hepsini kabul et
- Sadece çocukları ve yaralıları kabul et
- 10 kişiyi kabul et
- Reddet

Kabul edilen kişiler gerçek `Citizen` kayıtlarına dönüşmelidir.

Bu vatandaşların:

- yaşı
- mesleği
- becerileri
- sağlık durumu

olmalıdır.

---

# 22. ARAŞTIRMA

Araştırmalar puan satın alma sistemi değildir.

Araştırma için:

- laboratuvar
- araştırmacı
- enerji
- süre
- bazı durumlarda keşif bulgusu

gerekir.

MVP teknoloji ağacı:

## Kademe 1

- Gelişmiş Tarım
- Su Filtrasyonu
- Verimli Jeneratör
- Temel Antibiyotik Üretimi

## Kademe 2

- Hidroponik Tarım
- Güneş Enerjisi
- Gelişmiş Klinik
- Uzun Menzilli Radyo

Teknolojiler gerçek üretim katsayılarını değiştirmelidir.

---

# 23. OLAY SİSTEMİ

Olaylar yalnızca rastgele pop-up olmayacaktır.

Olaylar iki kategori:

## Rastgele

- soğuk hava
- jeneratör arızası
- kavga
- hastalık

## Koşullu

Örnek:

Yakıt < 50 ise:

> Yakıt rezervi kritik seviyede.

Nüfus > barınma kapasitesi ise:

> Evsiz nüfus artıyor.

Moral < 25 ise:

> Halk yönetimi sorgulamaya başladı.

---

# 24. GÜNLÜK

Tek bir olay günlüğü olmalıdır.

Örnek:

```txt
Gün 41
- Kuzey Çiftliği tamamlandı.
- 24 gıda üretildi.
- Elif Kaya hastalandı.
- Keşif Ekibi Bravo benzinliği keşfetti.
- Yakıt rezervi kritik seviyeye düştü.
```

Filtreler:

- tümü
- şehir
- keşif
- sağlık
- diplomasi
- kriz

---

# 25. İLERLEME AŞAMALARI

Oyuncunun ilerlemesi net hissedilmelidir.

## Kamp

Nüfus:

0–100

## Yerleşim

100–500

## Kasaba

500–2.500

## Şehir

2.500–20.000

## Bölgesel Merkez

20.000+

MVP'nin oynanabilir sınırı 2.500 nüfusa kadar olabilir.

Kod sistemi sonraki aşamalar için hazır tutulmalıdır.

---

# 26. GÖREVLER

Oyuncuya rehber görevler verilmelidir.

Başlangıç görevleri:

1. Nüfus için yeterli barınak oluştur.
2. 3 günlük gıda stoğu oluştur.
3. Bir çiftlik inşa et.
4. Keşif ekibi kur.
5. İlk POI'yi keşfet.
6. İlk NPC yerleşimini bul.
7. İlk ticareti yap.
8. Laboratuvar kur.
9. İlk teknolojiyi araştır.
10. Nüfusu 100'e çıkar.

Görevler oyuncuya mekanikleri doğal şekilde öğretmelidir.

---

# 27. UI DÜZENİ

Ana UI:

## Üst bar

Göster:

- tarih
- nüfus
- gıda
- su
- yakıt
- ilaç
- enerji üretim/tüketim
- moral
- sağlık

## Sol menü

- Şehir
- Nüfus
- İnşa
- Keşif
- Araştırma
- Diplomasi
- Günlük

## Sağ panel

Seçili bina / vatandaş / olay bilgisi.

## Alt alan

- pause
- 1x
- 2x
- 4x

---

# 28. ANA EKRANLAR

Aşağıdaki ekranlar çalışır durumda olmalıdır.

## Şehir

Grid ve binalar.

## Nüfus

Vatandaş listesi.

Filtre:

- meslek
- sağlık
- görev
- expedition

## İnşa

Bina kartları.

Maliyet.

Yerleştirme modu.

## Keşif

Fog of war bölgesel harita.

Ekipler.

POI'ler.

## Araştırma

Teknoloji ağacı.

## Diplomasi

Keşfedilmiş yerleşimler.

## Günlük

Tüm olay geçmişi.

---

# 29. SAVE / LOAD

Oyun otomatik kaydetmelidir.

LocalStorage kullan.

Auto-save:

- her oyun günü sonunda
- bina inşa edilince
- keşif gönderilince
- manuel save

Menü:

- Yeni Oyun
- Devam Et
- Kaydı Sil

Save data version numarası bulunmalıdır.

Örnek:

```ts
{
  version: 1,
  savedAt: "...",
  gameState: {}
}
```

---

# 30. GAME OVER

Aşağıdaki durumlarda oyun kaybedilebilir:

## Nüfus

Nüfus = 0

## Yönetim çöküşü

Moral ve güvenlik çok uzun süre kritik seviyede kalırsa.

MVP için:

moral < 10 ve güvenlik < 10 koşulu 7 gün sürerse.

Game Over ekranında:

- kaç gün yaşandı
- maksimum nüfus
- keşfedilen bölge
- inşa edilen bina
- ölen vatandaş
- araştırılan teknoloji

gösterilsin.

---

# 31. BASİT DENGE FORMÜLLERİ

Formüller ayrı dosyada tutulmalıdır.

Örnek:

```ts
foodConsumption = population * 1

waterConsumption = population * 1

farmProduction =
  baseProduction *
  workerEfficiency *
  techModifier *
  weatherModifier
```

Sağlık:

```ts
healthDelta =
  clinicEffect
  + foodEffect
  + waterEffect
  + heatEffect
  + diseaseEffect
```

Hiçbir kritik formül UI component içinde hardcode edilmemelidir.

---

# 32. DOSYA YAPISI

Öneri:

```txt
src/
  app/
    App.tsx
    router.tsx

  components/
    layout/
    ui/
    city/
    exploration/
    population/
    research/
    diplomacy/

  game/
    simulation/
      dailyTick.ts
      resources.ts
      health.ts
      population.ts
      buildings.ts
      expeditions.ts
      settlements.ts
      events.ts

    models/
      citizen.ts
      building.ts
      resource.ts
      settlement.ts
      expedition.ts
      research.ts

    data/
      buildings.ts
      technologies.ts
      events.ts
      names.ts
      poi.ts

    balance/
      constants.ts
      formulas.ts

  store/
    gameStore.ts

  pages/
    MainMenu.tsx
    CityPage.tsx
    PopulationPage.tsx
    ExplorationPage.tsx
    ResearchPage.tsx
    DiplomacyPage.tsx
    JournalPage.tsx

  services/
    saveService.ts

  utils/
```

---

# 33. STATE YÖNETİMİ

Tek dev state nesnesi yerine domain mantığıyla düzenli yapı kullan.

Örnek:

```ts
type GameState = {
  meta: GameMeta
  world: WorldState
  city: CityState
  citizens: Citizen[]
  expeditions: Expedition[]
  settlements: Settlement[]
  research: ResearchState
  journal: JournalEntry[]
}
```

---

# 34. SİMÜLASYON PRENSİBİ

UI ile simülasyon birbirinden ayrılmalıdır.

Şu fonksiyon:

```ts
simulateDay(state)
```

aynı input için öngörülebilir output üretmelidir.

Random gereken noktalarda seedable random sistemi kullanılmalıdır.

Amaç:

- test edilebilirlik
- save/load güvenilirliği
- ileride replay imkanı

---

# 35. RANDOM SEED

Yeni oyun başladığında seed oluştur.

```ts
gameSeed
```

Random olaylar seed'den üretilsin.

Mümkünse `seedrandom` veya küçük bir deterministic RNG kullan.

---

# 36. TESTLER

Aşağıdaki testler yazılmalıdır.

## Kaynak

- nüfus gıda tüketir
- nüfus su tüketir
- jeneratör yakıt tüketir

## Elektrik

- talep üretimi aşarsa düşük öncelikli bina kapanır

## Nüfus

- açlık sağlık düşürür
- susuzluk sağlık düşürür

## Bina

- kaynak yetersizse inşa başlamaz

## Keşif

- keşif tamamlanınca bölge görünür olur

## Ticaret

- ticaret her iki taraf stoklarını değiştirir

## Save

- save-load sonrası state korunur

---

# 37. GÖRSEL TARZ

Amaç:

Frostpunk kopyası yapmak değil.

Stil:

- koyu gri
- kirli beyaz
- pas tonları
- soluk mavi
- endüstriyel
- post-apokaliptik
- okunabilir

UI askeri terminal gibi olmamalıdır.

Modern yönetim oyunu hissi vermelidir.

---

# 38. SES

MVP'de zorunlu değildir.

Ancak event hook'ları bırakılabilir:

- bina tamamlandı
- keşif tamamlandı
- kriz
- ölüm
- yeni yerleşim
- araştırma tamamlandı

---

# 39. MVP KABUL KRİTERLERİ

MVP tamamlanmış sayılabilmesi için oyuncu:

1. Yeni oyun başlatabilmeli.
2. Şehir gridini görebilmeli.
3. Bina inşa edebilmeli.
4. Kaynakların günlük değişimini görebilmeli.
5. İşçi atayabilmeli.
6. Elektrik üretim/tüketim sistemini kullanabilmeli.
7. Hastalık yaşayabilmeli.
8. Keşif ekibi kurabilmeli.
9. Fog of war açabilmeli.
10. POI keşfedebilmeli.
11. Karar kartı çözebilmeli.
12. NPC yerleşim bulabilmeli.
13. Ticaret yapabilmeli.
14. Göçmen kabul edebilmeli.
15. Araştırma yapabilmeli.
16. Teknolojinin gerçek etkisini görebilmeli.
17. Save/load yapabilmeli.
18. Game over yaşayabilmeli.
19. En az 30 oyun günü oynanabilmeli.
20. Oyun yalnızca statik mock ekranlardan oluşmamalıdır.

---

# 40. GELİŞTİRME AŞAMALARI

Codex geliştirmeyi aşağıdaki sırayla yapmalıdır.

## PHASE 1 — Core

- proje kurulumu
- type modelleri
- Zustand store
- zaman sistemi
- kaynak sistemi
- günlük tick
- save/load

Bu aşamada çalışan basit UI olmalıdır.

---

## PHASE 2 — City

- şehir grid
- bina yerleştirme
- inşaat maliyeti
- üretim
- çalışan atama

---

## PHASE 3 — Population

- vatandaş kayıtları
- sağlık
- hastalık
- meslek
- ölüm

---

## PHASE 4 — Exploration

- world grid
- fog of war
- ekip
- seyahat
- POI
- event cards

---

## PHASE 5 — Settlements

- NPC yerleşimler
- gerçek stok
- trade
- göç

---

## PHASE 6 — Research

- laboratuvar
- araştırmacı
- teknoloji
- modifier sistemi

---

## PHASE 7 — Polish

- tutorial görevleri
- journal
- tooltips
- dashboard
- denge
- responsive düzen
- testler

---

# 41. CODEX İÇİN ÇALIŞMA KURALLARI

Codex aşağıdaki kurallara uymalıdır.

## 1

Eksik küçük detaylarda kullanıcıya soru sorma.

Makul bir oyun tasarımı kararı ver ve devam et.

## 2

Her phase sonunda:

```bash
npm run build
npm run test
```

çalıştır.

Hataları düzeltmeden sonraki phase'e geçme.

## 3

Placeholder mümkün olduğunca az kullanılmalı.

Bir sistem eklendiyse gerçekten state üzerinde etkili olmalı.

## 4

UI'da görünen değerlerin tamamı gerçek oyun state'inden gelmeli.

Sahte/demo sayılar gösterilmemeli.

## 5

Simülasyon component içinde yapılmamalı.

Simulation katmanında tutulmalı.

## 6

Her yeni mekanik için mümkünse en az bir test ekle.

## 7

Kod okunabilir olmalı.

Aşırı büyük component üretme.

## 8

TypeScript `any` kullanımını minimumda tut.

## 9

Build warning ve error bırakma.

## 10

Oyunu gerçekten oynayıp temel flow'u kontrol et.

---

# 42. İLK OYNANIŞ AKIŞI

Yeni oyun başladıktan sonra oyuncunun ilk 15 dakikası yaklaşık şu şekilde ilerlemelidir.

## Gün 1

Oyuncu yerleşimi görür.

Görev:

> Nüfusun için yeterli barınak oluştur.

---

## Gün 2

Gıda stoğunun sınırlı olduğu fark edilir.

Görev:

> İlk çiftliğini kur.

---

## Gün 3–4

Yakıt tüketimi belirginleşir.

Jeneratör oyuncuya enerji mantığını öğretir.

---

## Gün 5

Gözetleme kulesi veya keşif sistemi açılır.

İlk keşif görevi:

> Kuzeydeki bilinmeyen bölgeyi araştır.

---

## Gün 7–10

Benzinlik keşfedilir.

Karar kartı açılır.

Oyuncu riskli bir karar verir.

---

## Gün 10–15

İlk başka yerleşim sinyali bulunur.

Diplomasi açılır.

---

## Gün 15+

Oyuncu artık üç ana döngüyü aynı anda yönetir:

- şehir
- kaynak
- keşif

---

# 43. OYUNCUNUN HİSSETMESİ GEREKEN ŞEY

Sistemin başarısı yalnızca teknik olarak çalışmasına bağlı değildir.

Oyuncunun şu dönüşümü hissetmesi gerekir:

```txt
43 kişi
↓
barınak
↓
tarım
↓
enerji
↓
keşif
↓
yeni insanlar
↓
yeni teknoloji
↓
ikinci yerleşim
↓
ticaret ağı
↓
kasaba
↓
şehir
```

Her büyük ilerleme görsel veya mekanik olarak hissedilmelidir.

---

# 44. MVP SONRASI BACKLOG

MVP başarıyla bittikten sonra aşağıdaki mekanikler sırayla eklenebilir.

## Savunma

- baskın
- sur
- nöbet
- mühimmat
- milis

## Araçlar

- motosiklet
- kamyonet
- kamyon
- zırhlı araç

## Harita genişleme

- karakol
- maden
- çiftlik kolonisi
- ileri üs

## Bölgesel yönetim

Birden fazla yerleşim.

## Siyasi sistem

- konsey
- otorite
- halk desteği
- fraksiyonlar

## Suç

- hırsızlık
- kaçakçılık
- cinayet
- ayaklanma

## Savaş

Gerçek birlik sistemi.

- konvoy
- milis
- savunma hattı
- kuşatma
- ateşkes

Rastgele "savaş çıktı" bildirimi kullanılmamalıdır.

---

# 45. SON TALİMAT

Bu şartnameyi uygularken öncelik:

**oynanabilirlik > görsellik > ekstra özellik**

olmalıdır.

Önce sistemler gerçekten çalışmalıdır.

Bir oyuncu yalnızca değerleri seyretmemeli.

Sürekli:

- karar vermeli,
- bir şey kurmalı,
- bir yere insan göndermeli,
- kaynak değiştirmeli,
- risk almalı,
- sonuç görmelidir.

İlk sürümün ana başarı ölçütü:

> Oyuncu ilk 30 oyun gününde en az 15 anlamlı karar vermiş olmalı ve yerleşimin başlangıç halinden belirgin şekilde farklılaştığını görebilmelidir.

---

# 46. CODEX'E VERİLECEK TEK KOMUT

```txt
Read LAST_CITY_CODEX_SPEC.md completely.

Build the game described in this specification as a working browser-based MVP.

Do not create only mock screens. Implement the actual simulation and gameplay loops.

Work through the PHASES in order.

Make reasonable design decisions where the specification is silent instead of stopping for clarification.

After every phase run the build and tests, fix all errors, and keep the project runnable.

Use clean modular TypeScript architecture.

Continue until all MVP acceptance criteria in the specification are satisfied.
```
