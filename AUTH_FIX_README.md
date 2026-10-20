# WEB-17: beş rakamlı WhatsApp işlem kodu

Yeni Worker `BKMZ-12345` biçiminde beş rakam üretir. Web bu biçimi kabul eder;
geçişte önceki uzun kod yanıtlarını da okuyabilir. Automate'in `BKMZ-[0-9]+`
ifadesi yeni kodun tamamıyla eşleşir. Önce bu web dosyalarını, ardından
ayrı WhatsApp 5 Hane Worker paketini yükleyin. Bu değişiklik Firebase'e doğrudan
PUT izni vermez ve eski bot kayıtlarını otomatik müşteri onayına dönüştürmez.

# WEB-16: telefon doğrulamasına geri dönüş

WhatsApp'tan dönüldüğünde bekleyen doğrulama aynı hesapla sunucudan yeniden açılır.
“Şimdilik kapat” artık oturumu veya bekleyen telefon kaydını silmez. CSP hash'leri
HTML ve `_headers` içinde birlikte güncellendi; Firebase WebSocket politikası korundu.
Yeni 128 bit base64url kodu ve eski 32 hex kodu okunur. Worker güncellemesi ayrıdır.
TLS 1.3 için Cloudflare minimum TLS ayarı gerekir; HTML bunu zorlayamaz.
Kasa mTLS'si ayrı kasa hostname'inde uygulanır, müşteri sitesinde sertifika aranmaz.

Doğrulama: `node --test tests/*.test.cjs` — 30 test. Bunlar çevrimdışı testlerdir;
Android/WhatsApp veya Cloudflare canlı dağıtımının yapıldığı anlamına gelmez.

# Bekmez GO — giriş ve kayıt düzeltmesi (WEB-15)

Konsol kaydındaki kök sorun, Firebase Realtime Database bağlantısının yönlendirildiği sunucunun CSP tarafından engellenmesidir. Kimlik doğrulamasından sonraki hesap erişimi sorgusu yanıt beklerken giriş düğmesi süresiz dönüyordu. Bu sürüm ayrıca kesilen kayıt/e-posta akışını devam edilebilir hâle getirir.

## Değişen davranış

- Firebase 10.8.1 compat sürümünde belgelenmiş `Database.INTERNAL.forceWebSockets()` yöntemi, ilk veritabanı referansından önce çağrılır. JSONP/iframe long-polling kullanılmaz.
- CSP yalnızca `connect-src` içinde `wss://*.firebaseio.com/.ws` bağlantısına izin verir. Firebase sunucuları script veya iframe kaynağı olarak açılmaz. `unsafe-eval`, genel script jokeri veya `script-src unsafe-inline` eklenmez.
- Hesap erişimi, cihaz doğrulaması, API yanıtı, e-posta ve yerel kayıt işlemleri süreyle sınırlıdır. Hesap erişimi sorgusunun dinleyicisi süre aşımında kapatılır. Hatalar giriş ekranında aşama ve kodla görünür.
- Elle giriş ve otomatik oturum dinleyicisi aynı profili iki kez açmaz. Önceki kimlik isteği sonuçlanmadan ikinci hesap oluşturma isteği başlamaz.
- Kayıtta App Check ve güvenli yerel kayıt hesabı oluşturmadan önce kontrol edilir. E-posta gönderilemezse hesap silinmez; aynı e-posta/şifre ile devam ve yeniden gönderme mümkündür.
- E-posta kontrolü tek işlem olarak yürür; bağlantı kesintileri sessizce yutulmaz. İptal edilen eski kontrol yeni oturumda kayıt tamamlayamaz.
- App Check zorunluluğu, RTDB kuralları, müşteri hesabı koşulları ve sunucudaki cihaz imzası/telefon doğrulaması korunur. Bu değişiklik bunları devre dışı bırakmaz.

## Yayınlama

1. Mevcut Cloudflare Pages projesinin kaynaklarına bu dalı aktarın veya dağıtım arşivindeki dosyaları aynı projenin kök dizinine yükleyin. `index.html`, `paket.html`, `_headers`, `manifest.json`, `sw.js`, `icon-192.png` birlikte bulunmalıdır. `menu.html` değiştirilmedi.
2. **HTTP CSP başlığı ve HTML içindeki CSP birlikte güncellenmelidir.** Arşivdeki `_headers` bunu Pages için yapar. Cloudflare Transform Rule veya önündeki bir Worker ayrıca eski CSP ekliyorsa oradaki eski politika da bu dosyadaki yeni politika ile eşitlenmelidir. İki CSP'den daha gevşek olanı diğerini geçersiz kılamaz. Yalnız HTML yüklemek yeterli değildir.
3. Yeni dağıtımdan sonra `https://bekmezgo.com/` ağ yanıtındaki CSP'de `wss://*.firebaseio.com/.ws` ve WEB-15 HTML'inin SHA-256 script hash'lerini doğrulayın. Eski WEB-14 hash'iyle çalışan bir HTTP başlığı kalmamalıdır. Service worker önbellek adı bu sürümde değişmiştir.
4. Firebase'de mevcut Email/Password etkinliği ve Realtime Database App Check enforcement ayarını koruyun. Bu düzeltme için `pages.dev` alanını eklemek gerekmez. İstemci sorunu çözmek için veritabanı kuralları gevşetilmez.

## Kontrol senaryoları

- Mevcut, e-postası ve telefonu onaylı müşteri: giriş → profil → sayfayı yeniden açınca oturum devamı.
- Yeni müşteri: Gmail + parola + telefon → e-posta onayı → WhatsApp/kasa telefon onayı → profil.
- E-posta gelmezse: yeniden gönder; mevcut hesabı silmeden aynı bilgilerle devam et.
- Ağ kesilirse: dönüp duran düğme yerine aşama ve hata kodu; yanlışlıkla “yasaklı hesap” sonucu çıkmaması.
- App Check reddi, yanlış parola ve kapatılmış hesap: profil açılmaması; görünür hata.
- DevTools'ta Firebase `/.lp` script/iframe girişimleri olmaması; `/.ws` bağlantısının CSP'ye takılmaması.

## Doğrulama ve sınırlar

`node --test tests/auth.test.cjs` sevk edilen inline kodu sahte ağ/kimlik hizmetleriyle çalıştırır. Gerçek hesap oluşturmaz, e-posta göndermez veya üretim veritabanına yazmaz. Script sözdizimi, CSP hash'leri ve iki HTML giriş noktasının eşitliği ayrıca kontrol edilir.

Kullanıcının Firebase/Cloudflare yönetim oturumu ve gerçek müşteri test hesabı bu çalışma sırasında bağlı değildi. Bu nedenle gerçek hesapla giriş/kayıt, e-posta teslimi, WhatsApp/kasa onayı, uygulanan son HTTP başlığı ve yayın sonrası ağ erişimi henüz uçtan uca doğrulanmış değildir. Bunlar tamamlanmadan bu yama tüm sistem için üretim güvenliği onayı sayılmaz. WebSocket'in ağ tarafından engellendiği cihazlarda istemci, CSP'yi gevşeten JSONP'ye dönmek yerine süre sonunda hata verir.
