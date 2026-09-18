# Android APK

Uygulama kimliği: `com.kulden.game`. Android 7.0 (API 24) ve üzeri.
Oyun dosyaları uygulamanın içinde paketlenir; geliştirme sunucusu gerekmez.
Tarayıcıdaki kayıtlar uygulamaya otomatik aktarılmaz. Uygulama kaldırılırsa
yerel kayıt kaybolabilir; güncellemek için aynı imzalı APK mevcut uygulamanın
üzerine kurulmalıdır.

## Derleme (Windows)

```powershell
npm ci
npm run android:apk
```

JDK 21 ve Android SDK (`platforms;android-36`, `build-tools;35.0.0`) gerekir.
`JAVA_HOME` ve `ANDROID_HOME` ortam değişkenleri kullanılabilir. Bu bilgisayarda
araçlar `%LOCALAPPDATA%\KuldenBuild` altında kuruldu; derleme betiği bu yolu
otomatik bulur. Sistem genelindeki Java kurulumu değiştirilmez.

Çıktı: `artifacts/kulden-android-debug.apk`.

## Telefona kurulum

APK dosyasını telefona kopyalayın, Dosyalar uygulamasından açın ve gerekiyorsa
bu uygulama için bilinmeyen uygulama yükleme iznini verin. Kurulumdan sonra
KÜLDEN simgesinden başlatın. Bu paket test amaçlı debug imzası kullanır;
Google Play yayını için ayrı release imzası ve AAB hazırlanmalıdır.

## Cihaz kontrolü

- İlk açılış ve uçak modunda yeniden açılış.
- Saha açma, işçi atama, üretim ve sipariş teslimi.
- Uygulamayı kapatıp açınca kaydın korunması.
- Dikey/yatay ekran, açılır pencereler ve klavye.
- Ekran kilitleme, arka plana geçiş ve geri dönüş.

Fiziksel cihaz doğrulaması ayrıca yapılmalıdır.
