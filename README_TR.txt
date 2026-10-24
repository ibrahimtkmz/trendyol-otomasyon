OTOMASYON (Trendyol Bonuslu Teklifler + AFF Hakediş/Ziyaret)
=============================================================
Klasör: C:\Users\user\otomasyon
Bu program Grok olmadan, bu bilgisayarda Windows Görev Zamanlayıcı ile gizli çalışır.
Fare/klavyeye dokunmaz; BlueStacks'e ADB ile, Trendyol sitesine görünmez bir tarayıcıyla bağlanır.
Asla sipariş vermez, ödeme yapmaz, "Sepeti Onayla"ya basmaz. Tablolarda satır silmez.

NE YAPAR
- AFF (her gün 10:30, 12:30 ... 22:30): AFF tablosunda bugünün sekmesi (ör. 24.10) içinde
  J (kişi) ve K (marka) okunur. Kişinin BlueStacks'inde Raporlar > Marka İş Birliklerim >
  Komisyonlu Marka Teklifleri'nde marka aranır; en üstteki "Yayında" kart, yoksa dün/bugün
  başlamış kart kullanılır. Q = Ziyaretçi, R = Toplam Kazanç yazılır. L ve M'ye dokunmaz.
  Q sadece yeni değer eskisinden büyük/eşitse yazılır. :30 turunda ziyaretçi artışı yoksa
  :40'ta bir kez daha bakar.
  BlueStacks: VEDAT 127.0.0.1:5555, İLHAN emulator-5564, ANIL 127.0.0.1:5585, ŞUHEDA 127.0.0.1:5595.
  HACER atlanır (config.json içinde "HACER" satırına serial yazıp "atla" yı kaldırarak eklenebilir).
- TRENDYOL (her gün 11:00, 15:00, 21:00): BlueStacks 4'te (127.0.0.1:5585) Bonuslu Teklifler
  listesi en üste kaydırılıp taranır. Sadece bugün başlayan teklifler, ty.gl linkine göre tekil
  olarak "24 Ekim 2026" gibi sekmeye eklenir (sekme yoksa önceki günün sekmesi kopyalanıp
  açılır). Bonus >= Eşik/2 ya da (Bonus 500 ve Eşik <= 750) olanlarda sepet tutarı hesaplanır
  (3 adet, Ara Toplam - Toplam Kazancın), sepet önce ve sonra boşaltılır. Tablo ROAS'a göre
  sıralanır. Yeni teklif, ROAS > 2 ve hatalar Windows bildirimi olarak gelir.
- İki iş de BlueStacks 4'ü kullandığı için aynı anda çalışmaz (kilit dosyası: data\bs4.lock).

GEREKENLER: Bilgisayar açık ve oturum açık olmalı, BlueStacks pencereleri açık ve ADB açık olmalı.
BlueStacks 4'te Trendyol uygulaması Marka Tekliflerim > Bonuslu Teklifler ekranında bırakılmalı.
Not: Tarama sırasında ty.gl linkleri panodan (kopyala-yapıştır) okunur; o sırada panonuz değişebilir.

ADIM 1 - GOOGLE SERVİS HESABI (bir kez)
 1. https://console.cloud.google.com adresine girin, üstten "Proje seç" > "Yeni proje" (ad: otomasyon).
 2. Sol menü "API'ler ve Hizmetler" > "Kitaplık" > "Google Sheets API" > "Etkinleştir".
 3. "API'ler ve Hizmetler" > "Kimlik bilgileri" > "Kimlik bilgisi oluştur" > "Hizmet hesabı".
    Ad verin (ör. otomasyon), "Bitti".
 4. Oluşan hizmet hesabına tıklayın > "Anahtarlar" > "Anahtar ekle" > "Yeni anahtar oluştur" > JSON.
 5. İnen dosyanın adını service_account.json yapıp C:\Users\user\otomasyon içine koyun.
    Bu dosyayı kimseyle paylaşmayın.

ADIM 2 - TABLOLARI PAYLAŞMA
 service_account.json'u Not Defteri ile açın, "client_email" değerini kopyalayın
 (xxx@yyy.iam.gserviceaccount.com). Şu iki tabloyu bu adresle "Düzenleyen" olarak paylaşın:
  - AFF:      https://docs.google.com/spreadsheets/d/164FjHK9gUMiX-mQzfvbwffqxPPV7gX8nvuDEpvu37rY
  - Trendyol: https://docs.google.com/spreadsheets/d/13GR6LeIopJqnLCpXcKqywZMsdt4IB8nDwG05VKAnhWY
 (Paylaş > adresi yapıştır > Düzenleyen > "Bildir" işaretini kaldırabilirsiniz > Paylaş)

ADIM 3 - KURULUM VE TRENDYOL GİRİŞİ
 1. Klasörde kurulum.ps1 üzerine sağ tık > "PowerShell ile çalıştır"
    (ya da: powershell -ExecutionPolicy Bypass -File C:\Users\user\otomasyon\kurulum.ps1)
 2. Paketler ve tarayıcı iner, tablo bağlantısı test edilir ("OK ..." yazmalı).
 3. Enter'a basınca bir tarayıcı açılır: Trendyol hesabınıza giriş yapın (SMS kodu vs.),
    sonra pencereyi kapatın. Oturum data\trendyol_profil içinde saklanır.
 4. Görevler kaydedilir. Bitti.
 Trendyol oturumu düşerse: kurulum.ps1 -SadeceGiris

BAŞLATMA / DURDURMA
 - Durdur:  durdur.ps1 (sağ tık > PowerShell ile çalıştır) - görevleri kapatır, çalışan turu keser.
 - Başlat:  baslat.ps1
 - Hemen bir tur çalıştır:  simdi_calistir.ps1 -is trendyol   veya   -is aff
 - Tamamen kaldır: kaldir.ps1
 - Görevleri görmek için: Görev Zamanlayıcı > Görev Zamanlayıcı Kitaplığı > Otomasyon

SAATLERİ DEĞİŞTİRME
 config.json'u Not Defteri ile açın, "zamanlar" kısmındaki saatleri düzenleyin
 (ör. "trendyol": ["11:00","15:00","21:00"]), kaydedin ve şunu çalıştırın:
   powershell -ExecutionPolicy Bypass -File C:\Users\user\otomasyon\kurulum.ps1 -SadeceGorev

LOGLAR
 logs\aff_YYYYMMDD.log, logs\trendyol_YYYYMMDD.log, logs\bildirimler.txt (tüm bildirimler),
 logs\konsol.log. Tarama ham çıktısı: data\runner.log, data\runner_raw.log, data\f_new.jsonl.

ELLE TEST
 cd C:\Users\user\otomasyon
 node src\main.js test                      (tablo erişimi)
 node src\main.js aff main                  (AFF turunu şimdi çalıştır)
 node src\main.js trendyol sadece-sepet     (taramasız: sadece sepet + sıralama)
 node src\main.js sepet-test https://ty.gl/xxxx   (tek link sepet tutarı)
 Sepet hesabını görerek izlemek için config.json'da "sepetHeadless": false yapın.
