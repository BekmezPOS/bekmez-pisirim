
    // ==========================================
    // 1. SİSTEM DEĞİŞKENLERİ VE SVG İKONLARI
    // ==========================================
    const emptyHistorySVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    const emptyCartSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`;
    const emptyCouponSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="8" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line></svg>`;
    
    const FIREBASE_URL = "https://bekmezpos-default-rtdb.firebaseio.com";
    const DUKKAN_ENLEM = 36.206278; const DUKKAN_BOYLAM = 36.134472; const MAKS_MESAFE_KM = 4; const GHOST_TIMEOUT_MS = 8 * 60 * 60 * 1000; 
    // UYARI: Bu sabitler gizli anahtar degildir. Eski istemci kayitlarinin cozulmesi icin
    // sadece format isaretcisi olarak tutulur; Base64 veya bu degerler kriptografi saglamaz.
    const CARK_LEGACY_MARKER = "BEKMEZ_GO_SECURE_2026"; const TIME_LEGACY_MARKER = "BKMZ_TIME_SEAL_X9";
    const DUKKAN_WHATSAPP_NUMARASI = "905369517776"; 
    
    let CARK_ODULLERI = ["🍟 Ekstra Patates", "😔 Pas", "🥤 1 Lt İçecek", "😔 Pas", "🍰 Fırın Sütlaç"];
    let ekmekUrunAdi = "Ekmek"; let ekmekBirimFiyati = 0; let sepet = []; let hamToplamFiyat = 0; let sonOdenecekFiyat = 0;
    let aktifKuponKodu = ""; let aktifKuponIndirimTutari = 0; let aktifKuponAltLimit = 0; let aktifKuponHedefUrun = "Herşey"; 
    let tumUrunler = []; let aktifKategori = 'Ana Yemek'; let sonMenuVerisi = ""; let sonMenuVersiyonu = "";
    let seciliUrun = null; let seciliMiktar = 0; let seciliFiyat = 0; let seciliEkstraIstekler = []; let seciliOzelEkmekTip = "Normal"; 
    let baseKgBread = 0; let ekstraEkmekKg = 0; let seciliUrunStok = 999; let oncekiToplamFiyat = 0; let oncekiPopupFiyat = 0; let oncekiPopupMiktar = 0;
    let populerUrunlerListesi = []; let aktifAdisyonDinleyiciRef = null; let menuDinleyiciRef = null; let sonCekilenAdisyonHTML = ""; let sonKuponVerisi = ""; let isProcessingOrder = false;
    let emailInterval = null; let whatsappInterval = null; let aktifWhatsappKodu = ""; let aktifWhatsappNumarasi = "";
    let sepetHatirlaticiTimer = null; let serverTimeOffset = 0; let spamTimerInterval = null; let adisyonSayacInterval = null;
    let sistemAyarlariDinleyiciRef = null; let bildirimDinleyiciRef = null;
    
    window.isAddingToCart = false; let deferredPrompt; window.isOrderFinished = false; let aktifKullanilanCarkOdulu = null; 
    
    // GÜVENLİK VE ROL DURUMLARI
    let isStoreClosed = false; 
    let isBannedUser = false;

    // ==========================================
    // 2. SİBER GÜVENLİK VE FIREBASE BAŞLATMA
    // ==========================================
    const firebaseConfig = {
        apiKey: "AIzaSyC8WLup5zoOmFBcFJkflo7J-XJjQEK_jr8", authDomain: "bekmezpos.firebaseapp.com",
        databaseURL: "https://bekmezpos-default-rtdb.firebaseio.com", projectId: "bekmezpos",
        storageBucket: "bekmezpos.firebasestorage.app", messagingSenderId: "1013709760225",
        appId: "1:1013709760225:web:ec71341cb6cdcce9fbf9a0", measurementId: "G-BXKNH6B49K"
    };
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

    // UCRETSIZ YEREL BILDIRIMLER — ek sunucu, FCM tokeni veya DB kuralı gerekmez.
    // Tarayici calisirken ve gerekli izin varsa cihaz bildirimi olusturur.
    const BEKMEZ_SW_PATH = './sw.js';
    const BG_CART_DELAY_MS = 60 * 60 * 1000;
    const BG_CART_SIG_KEY = 'bg_local_cart_signature';
    const BG_CART_TIME_KEY = 'bg_local_cart_changed_at';
    const BG_CART_DONE_KEY = 'bg_local_cart_notified_signature';
    const BG_PRICE_CACHE_KEY = 'bg_local_price_snapshot_v1';
    let bekmezSWRegistration = null;
    let bgCartReminderTimeout = null;
    let bgCartReminderInterval = null;
    let pushCartNoticeAt = 0;

    async function PushServisCalistir() {
        if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
        try {
            bekmezSWRegistration = await navigator.serviceWorker.register(BEKMEZ_SW_PATH, {scope:'./'});
            return bekmezSWRegistration;
        } catch (_) { return null; }
    }

    function CartSignature() {
        if (!Array.isArray(sepet) || sepet.length === 0) return '';
        return JSON.stringify(sepet.map(p=>({n:p.rawName,q:p.quantity,a:p.baseStockAmount})));
    }
    function SepetHatirlatmaKontrol() {
        const signature = CartSignature();
        if (!signature || isBannedUser || isStoreClosed || localStorage.getItem('bg_active_order_id')) return false;
        const last = Number(localStorage.getItem(BG_CART_TIME_KEY));
        const age = Date.now() - last;
        if (!Number.isFinite(last) || last <= 0 || age < BG_CART_DELAY_MS || age > 48*60*60*1000) return false;
        if (localStorage.getItem(BG_CART_SIG_KEY) !== signature || localStorage.getItem(BG_CART_DONE_KEY) === signature) return false;
        // Izin verilmediyse hatirlatmayi tuketme; kullanici sonradan izin verebilir.
        if (!('Notification' in window) || Notification.permission !== 'granted') return false;
        // Kaydi once isaretle: guncelleme/visibility olaylari birden fazla bildirim olusturmasin.
        localStorage.setItem(BG_CART_DONE_KEY,signature);
        BildirimGonder('Sepetin seni bekliyor 🛍️', 'Sepetindeki lezzetler hazir. Siparisini tamamlamayi unutma!', true, 'sepet');
        return true;
    }
    function PushSepetDurumuYansit() {
        if (bgCartReminderTimeout) clearTimeout(bgCartReminderTimeout);
        const sig = CartSignature();
        if (!sig) {
            [BG_CART_SIG_KEY,BG_CART_TIME_KEY,BG_CART_DONE_KEY].forEach(k=>localStorage.removeItem(k));
            return;
        }
        if (localStorage.getItem(BG_CART_SIG_KEY) !== sig) {
            localStorage.setItem(BG_CART_SIG_KEY,sig);
            localStorage.setItem(BG_CART_TIME_KEY,String(Date.now()));
            localStorage.removeItem(BG_CART_DONE_KEY);
        }
        SepetHatirlatmaKontrol();
        const elapsed=Date.now()-Number(localStorage.getItem(BG_CART_TIME_KEY));
        if (elapsed < BG_CART_DELAY_MS && !localStorage.getItem(BG_CART_DONE_KEY)) {
            bgCartReminderTimeout=setTimeout(SepetHatirlatmaKontrol, Math.max(1000,BG_CART_DELAY_MS-elapsed+300));
        }
    }
    function PushCihazKaydiniSil() {
        if (bgCartReminderTimeout) clearTimeout(bgCartReminderTimeout);
        [BG_CART_SIG_KEY,BG_CART_TIME_KEY,BG_CART_DONE_KEY].forEach(k=>localStorage.removeItem(k));
        // Onceki FCM surumunden kalmis yalnizca bu cihaza ait yerel tanimi temizle.
        localStorage.removeItem('bg_push_device');
        return Promise.resolve();
    }

    function IndirimleriKontrolEt(urunler) {
        if (!Array.isArray(urunler)) return;
        const latest={};
        for(const u of urunler) {
            if (!u || typeof u.pName!=='string' || !u.pName.trim()) continue;
            const price=Number(String(u.price1Kg||'').replace(',','.'));
            if(Number.isFinite(price) && price>0) latest[u.pName]=price;
        }
        try {
            const oldJSON=localStorage.getItem(BG_PRICE_CACHE_KEY);
            const old=oldJSON ? JSON.parse(oldJSON) : null;
            localStorage.setItem(BG_PRICE_CACHE_KEY,JSON.stringify(latest));
            if(!old || typeof old!=='object' || Array.isArray(old) || isBannedUser) return;
            const drops=Object.entries(latest).filter(([name,price])=>
                Object.prototype.hasOwnProperty.call(old,name) &&
                Number.isFinite(Number(old[name])) && Number(old[name])>price);
            if (!drops.length) return;
            const [name,price]=drops[0];
            const title=drops.length===1 ? 'Yeni indirim! 🎉' : `${drops.length} urunde yeni indirim! 🎉`;
            const body=drops.length===1 ? `${name}: ${price.toLocaleString('tr-TR')} TL. Menude kesfet!`
                : `${name} ve diger indirimli urunlere goz at!`;
            BildirimGonder(title,body,true,'urunler');
        } catch (_) { /* Yerel kayitlara erisim engellenirse menuyu bozma. */ }
    }

    // Service worker bildirimine tiklaninca ilgili ekrani ac.
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event=>{
            const msg=event.data;
            if (!msg || msg.type!=='BEKMEZ_PUSH_OPEN' || !['urunler','sepet','gecmis','profil','firsatlar'].includes(msg.page)) return;
            if (!isBannedUser && !isStoreClosed && typeof SayfaGoster==='function') SayfaGoster(msg.page);
        });
    }
    window.addEventListener('load',()=>{
        PushServisCalistir();
        const requested=new URLSearchParams(location.search).get('bildirim');
        if(['urunler','sepet','gecmis','profil','firsatlar'].includes(requested)) {
            setTimeout(()=>{if(!isBannedUser && !isStoreClosed) SayfaGoster(requested);},3200);
            history.replaceState(null,'',location.pathname);
        }
        // Arka planda sure sinirlandirilabilir, sayfaya donunce yeniden kontrol et.
        if (!bgCartReminderInterval) bgCartReminderInterval=setInterval(SepetHatirlatmaKontrol,60000);
    });
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible') { SepetHatirlatmaKontrol(); BildirimDurumunuGuncelle(); }});
    window.addEventListener('pageshow',SepetHatirlatmaKontrol);

    const appCheck = firebase.appCheck();
    appCheck.activate(new firebase.appCheck.ReCaptchaEnterpriseProvider('6LfaV-AtAAAAAGqAbPWGYWxmlGfQNasMlne4iHne'), true);

    const orjinalFetch = window.fetch;
    let bgAppCheckPromise = null;
    window.fetch = async function(input, init = {}) {
        const url = new URL(input instanceof Request ? input.url : String(input), location.href);
        if (url.origin !== new URL(FIREBASE_URL).origin) return orjinalFetch.call(this, input, init);
        let tokenRes;
        try {
            if (!bgAppCheckPromise) bgAppCheckPromise = appCheck.getToken(false).finally(() => { bgAppCheckPromise = null; });
            tokenRes = await bgAppCheckPromise;
            if (!tokenRes?.token) throw new Error('Token yok');
        } catch (_) { throw new Error('Uygulama doğrulaması başarısız (App Check). Siteyi yenileyin; sürerse web uygulamasının reCAPTCHA ve alan adı ayarları kontrol edilmeli.'); }
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(init.headers).forEach((v,k) => headers.set(k,v));
        headers.set('X-Firebase-AppCheck', tokenRes.token);
        const controller = new AbortController();
        const sourceSignal = init.signal || (input instanceof Request ? input.signal : null);
        const abort = () => controller.abort();
        if (sourceSignal?.aborted) abort(); else sourceSignal?.addEventListener('abort', abort, {once:true});
        const timer = setTimeout(abort, 20000);
        try { return await orjinalFetch.call(this, input, {...init, headers, signal:controller.signal}); }
        finally { clearTimeout(timer); sourceSignal?.removeEventListener('abort', abort); }
    };
    function SiparisHttpHatasi(status) {
        if (status === 401 || status === 403) return new Error('Firebase siparişi reddetti (HTTP ' + status + '). Müşteri sipariş kuralları, doğrulanmış hesap ve web App Check ayarları kontrol edilmeli.');
        return new Error('Sipariş sunucusu hata verdi (HTTP ' + status + '). Aynı sipariş için yeniden deneyebilirsiniz.');
    }

    firebase.auth().languageCode = 'tr';

    // v13: Kişisel veriler ayrı AES-GCM kasasında; genel UI tercihleri localStorage içindedir.
    // Aynı origin içinde çalıştırılabilen zararlı JavaScript ve ele geçirilmiş cihaz bu korumanın dışındadır.
    async function SecureKaydet(anahtar,veri){return BekmezSecurity.save(anahtar,veri);}
    async function SecureOku(anahtar){return BekmezSecurity.load(anahtar);}
    async function SecureSil(anahtar){return BekmezSecurity.remove(anahtar);}

    function ZararliKarakterTemizle(el) { el.value = el.value.replace(/[<>\\/{}\[\]]/g, ''); }
    function escapeHTML(str) { return str ? str.toString().replace(/[&<>'"]/g, function(tag){ return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[tag]; }) : ""; }
    function HapticTitresim() { if(navigator.vibrate) navigator.vibrate(15); }
    function generateUUID() {
        if(!window.isSecureContext || !window.crypto || !crypto.getRandomValues) throw new Error('Guvenli rastgelelik kullanilamiyor. HTTPS gerekli.');
        if (crypto.randomUUID) return crypto.randomUUID();
        const b = new Uint8Array(16); crypto.getRandomValues(b);
        b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
        const hex = Array.from(b, x => x.toString(16).padStart(2,'0')).join('');
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
    function ZamanMuhruKodla(ts, id) { return btoa(encodeURIComponent(`${ts}|||${id}|||${TIME_LEGACY_MARKER}`)); }
    function ZamanMuhruOku(hash, id) { if(!hash) return 0; try { let dec = decodeURIComponent(atob(hash)); let parts = dec.split("|||"); if(parts.length === 3 && parts[1] === id && parts[2] === TIME_LEGACY_MARKER) return parseInt(parts[0]); } catch(e) {} return 0; }
    
    function GetDistanceKm(lat1, lon1, lat2, lon2) { const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180; const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2); return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); }

    // Uyari pencereleri API/veritabani kaynakli HTML calistirmasin.
    // Eski sabit mesajlardaki <b>/<br> bicimlendirmesini koruyan dar izin listesi.
    function GuvenliUyariIcerigi(icerik) {
        const t = document.createElement('template'); t.innerHTML = String(icerik ?? '');
        const safe = document.createElement('div');
        const allowed = new Set(['B','STRONG','I','EM','BR']);
        function walk(source, target) {
            for (const child of Array.from(source.childNodes)) {
                if(child.nodeType === Node.TEXT_NODE) target.appendChild(document.createTextNode(child.nodeValue));
                else if(child.nodeType === Node.ELEMENT_NODE) {
                    if (allowed.has(child.tagName)) {
                        const el=document.createElement(child.tagName.toLowerCase());
                        if(child.tagName !== 'BR') walk(child,el);
                        target.appendChild(el);
                    } else target.appendChild(document.createTextNode(child.textContent || ''));
                }
            }
        }
        walk(t.content,safe); return safe.innerHTML;
    }

    function PremiumIcon(kind='info') {
        const paths={info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',warning:'<path d="m12 3 10 18H2L12 3ZM12 9v5M12 17h.01"/>',food:'<path d="M4 16h16M6 16a6 6 0 0 1 12 0M12 8V6M3 20h18"/>',drink:'<path d="M6 6h12l-2 15H8L6 6ZM13 6l2-4h4M8 11h8"/>',side:'<path d="M3 12h18a9 9 0 0 1-18 0ZM7 8l3 4M12 4v8M17 7l-2 5"/>',gift:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>'};
        return '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[kind]||paths.info)+'</svg>';
    }
    const premiumDialogFocus=new Map();
    function PremiumDialogOpen(id){const p=document.getElementById(id);if(!p)return;if(!premiumDialogFocus.has(id))premiumDialogFocus.set(id,document.activeElement);document.body.style.overflow='hidden';p.style.display='flex';p.classList.add('active');p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.tabIndex=-1;requestAnimationFrame(()=>{if(p.style.display!=='none'&&!p.contains(document.activeElement))(p.querySelector('button,summary,[href],input')||p).focus();});}
    function PremiumDialogClose(id){const p=document.getElementById(id);if(!p)return;p.classList.remove('active');p.style.display='none';const prior=premiumDialogFocus.get(id);premiumDialogFocus.delete(id);if(!premiumDialogFocus.size)document.body.style.overflow='';if(prior?.isConnected)prior.focus();}
    function OzelUyariGoster(baslik,metin,ikon){document.getElementById('custom-alert-title').textContent=baslik;document.getElementById('custom-alert-text').innerHTML=GuvenliUyariIcerigi(metin);document.getElementById('custom-alert-icon').innerHTML=PremiumIcon(/🔒|🛡/.test(ikon)?'lock':/✅|🎉/.test(ikon)?'check':/⚠|❌|🚫/.test(ikon)?'warning':'info');PremiumDialogOpen('custom-alert-overlay');}
    function KapatUyariModal(e,force=false){for(const id of ['custom-alert-overlay','distance-alert-overlay']){const p=document.getElementById(id);if(force||e?.target===p)PremiumDialogClose(id);}}
    document.addEventListener('keydown',event=>{const ids=['custom-alert-overlay','confirm-overlay','legal-popup','distance-alert-overlay','cark-result-popup','cark-popup'];const id=ids.find(id=>document.getElementById(id)?.style.display==='flex');if(!id)return;const p=document.getElementById(id);if(event.key==='Escape'){event.preventDefault();PremiumDialogClose(id);return;}if(event.key!=='Tab')return;const list=[...p.querySelectorAll('button:not(:disabled),a[href],summary,input:not(:disabled),[tabindex="0"]')].filter(x=>x.getClientRects().length);if(!list.length){event.preventDefault();p.focus();return;}const first=list[0],last=list[list.length-1];if(event.shiftKey&&(document.activeElement===first||!p.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!p.contains(document.activeElement))){event.preventDefault();first.focus();}});

    function SoruSor(baslik, metin, ikon, evetCallback, isDanger=false) { document.getElementById("confirm-title").innerText = baslik; document.getElementById("confirm-text").innerHTML = GuvenliUyariIcerigi(metin); document.getElementById("confirm-icon").innerText = ikon; let btn = document.getElementById("confirm-yes-btn"); let box = document.getElementById("confirm-box"); let glow = document.getElementById("confirm-glow"); if(isDanger) { btn.style.background = "var(--danger)"; btn.innerText = "İşlemi Onayla"; box.style.borderColor = "var(--danger)"; glow.style.background = "var(--danger)"; } else { btn.style.background = "var(--primary)"; btn.innerText = "Onayla"; box.style.borderColor = "var(--primary)"; glow.style.background = "var(--primary)"; } document.getElementById("confirm-yes-btn").onclick = () => { KapatConfirmModal(null, true); if(evetCallback) evetCallback(); }; PremiumDialogOpen('confirm-overlay'); }
    function KapatConfirmModal(e,force=false){if(force||e?.target===document.getElementById('confirm-overlay'))PremiumDialogClose('confirm-overlay');}
    

    async function SyncServerTime() { try { let st = Date.now(); let res = await fetch(window.location.href, { method: "HEAD", cache: "no-cache" }); let sDate = res.headers.get("Date"); if(sDate) { let serverDate = new Date(sDate).getTime(); let latency = (Date.now() - st) / 2; serverTimeOffset = (serverDate + latency) - Date.now(); } } catch(e) { serverTimeOffset = 0; } }
    function GetServerTimeFast() { return Date.now() + serverTimeOffset; }

    // Ucretsiz: Firebase olaylari sayfa calisirken sessiz sistem bildirimi olusturur.
    // Sayfa tamamen kapaliysa tetikleyici olmadigindan otomatik push yoktur.
    
    
    

    

    // Tamamen özgün, otomotiv-esintili sinüs/üçgen harmonikleri.
    // Master seviyeyi kısık tutar; dışarıdan müzik/ses dosyası yüklemez.
    

    function BildirimDurumunuGuncelle() {
        const x = document.getElementById('bg-notify-status');
        if (!x) return;
        if (!('Notification' in window) || !window.isSecureContext) {
            x.textContent = 'Bu tarayıcıda veya bağlantıda telefon bildirimleri desteklenmiyor.';
        } else if (Notification.permission === 'granted') {
            x.textContent = 'Bildirimler açık. Uygulama çalışırken telefonuna sessiz sistem bildirimleri gelir.';
        } else if (Notification.permission === 'denied') {
            x.textContent = 'Bildirimlere izin verilmemiş. İstersen telefonunun tarayıcı/site ayarlarından değiştirebilirsin.';
        } else {
            x.textContent = 'Bildirimleri aç düğmesiyle izin verebilirsiniz. İzin vermeden sipariş verebilirsiniz.';
        }
    }

    // Chrome/Safari/Firefox genellikle izni sayfa açılır açılmaz istemeye izin vermez.
    // Ayrı ayar düğmesi gerekmeksizin ilk gerçek kullanıcı etkileşiminde sor.
    let bgBildirimIzinIstegiBasladi = false;
    function BildirimIzniIlkEtkilesimdeIste() {
        if (bgBildirimIzinIstegiBasladi || isBannedUser) return;
        if (!window.isSecureContext || !('Notification' in window) || Notification.permission !== 'default') return;
        try {
            if (sessionStorage.getItem('bg_notify_permission_asked') === '1') return;
        } catch (_) {}
        bgBildirimIzinIstegiBasladi = true;
        try { sessionStorage.setItem('bg_notify_permission_asked','1'); } catch (_) {}
        // Kullanıcı etkileşiminin hemen içinde çağır: araya async await koyma.
        try {
            Promise.resolve(Notification.requestPermission()).then(() => {
                BildirimDurumunuGuncelle();
                if (Notification.permission === 'granted') PushSepetDurumuYansit();
            }).catch(() => { BildirimDurumunuGuncelle(); });
        } catch (_) { BildirimDurumunuGuncelle(); }
    }
    // Eski fonksiyon adlariyla uyumluluk; artik elle izin secme butonu yok.
    function BildirimIzniAc() { BildirimIzniIlkEtkilesimdeIste(); }
    function SessizIzinIste() { /* Otomatik izin, ilk kullanici etkileşiminde sorulur. */ }

    function BildirimGonder(baslik, mesaj, sesli=true, hedef=null) {
                if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const name=String(baslik||'bilgi');
        const page=hedef || (/sepet/i.test(name) ? 'sepet' : /sipari[şs]|kurye|mutfak|teslim/i.test(name) ? 'gecmis' : /indirim/i.test(name) ? 'urunler' : /duyuru/i.test(name) ? 'firsatlar' : 'profil');
        const opts = {body: String(mesaj||''), icon:'icon-192.png', badge:'icon-192.png', tag:'bekmez-go-'+name.slice(0,40),
                      requireInteraction:false, silent:true, data:{page}};
        // register edilmemiş SW için navigator.serviceWorker.ready beklemesi sonsuzdur.
        // Mobilde Notification() çoğunlukla desteklenmez; kayıtlı SW varsa onu kullan.
        (async () => {
            try {
                const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
                if (registration && typeof registration.showNotification === 'function') {
                    await registration.showNotification(String(baslik||'Bekmez GO'), opts);
                } else if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'')) {
                    new Notification(String(baslik||'Bekmez GO'), opts);
                }
            } catch (e) { console.warn('Sistem bildirimi gösterilemedi:',e); }
        })();
    }
        function BgSesKullaniciEtkilesimi(){
        
    }
    document.addEventListener('pointerdown', BgSesKullaniciEtkilesimi, {passive:true});
    document.addEventListener('keydown', BgSesKullaniciEtkilesimi);

    // ŞİFRE GÖSTER / GİZLE FONKSİYONU
    function SifreGosterGizle(inputId, iconSpan) {
        let inp = document.getElementById(inputId);
        if(inp.type === "password") { inp.type = "text"; iconSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line></svg>`; } 
        else { inp.type = "password"; iconSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`; }
    }

    // ==========================================
    // 3. ADMİN PANELİ VE SİSTEM AYARLARI
    // ==========================================
    let banDinleyicileri = [], banNesli = 0, banAuthNesli = 0, banOturumu = '';
    function BanDinlemeyiDurdur() {
        ++banNesli;
        for (const {ref, callback} of banDinleyicileri) ref.off('value', callback);
        banDinleyicileri = []; banOturumu = '';
    }
    function BanOturumunuKapat(uid, sebep) {
        if (firebase.auth().currentUser?.uid !== uid || isBannedUser) return;
        isBannedUser = true;
        BanDinlemeyiDurdur();
        for (const id of ['splash-screen', 'main-user-ui']) {
            const el = document.getElementById(id); if (el) el.style.display = 'none';
        }
        const reason = document.getElementById('banned-reason-text');
        if (reason) reason.textContent = sebep || 'Hesabınızın erişimi kapatıldı.';
        const overlay = document.getElementById('banned-user-overlay');
        if (overlay) overlay.style.display = 'flex';
        if (aktifAdisyonDinleyiciRef) { aktifAdisyonDinleyiciRef.off(); aktifAdisyonDinleyiciRef = null; }
        if (typeof bgDurumRef !== 'undefined' && bgDurumRef) { bgDurumRef.off(); bgDurumRef = null; }
        firebase.auth().signOut().catch(() => {
            if (reason) reason.textContent += ' Oturum kapatılamadı; bağlantıyı kontrol edin.';
        });
    }
    function BanCanliDinle(tel){
      const user=firebase.auth().currentUser;if(!user?.emailVerified)return;
      const key=user.uid;if(banOturumu===key)return;BanDinlemeyiDurdur();banOturumu=key;
      const generation=banNesli,uid=user.uid,ref=firebase.database().ref('HesapErisimleri/'+uid);
      const current=()=>generation===banNesli&&firebase.auth().currentUser?.uid===uid;
      const callback=snapshot=>{const value=snapshot.val();if(current()&&(value?.banned===true||value?.deleted===true))BanOturumunuKapat(uid,value.sebep||'Hesabınızın erişimi kapatıldı.');};
      banDinleyicileri.push({ref,callback});ref.on('value',callback,()=>{if(current())BanOturumunuKapat(uid,'Hesap erişimi doğrulanamadı. Bağlantı ve izinleri kontrol ederek tekrar giriş yapın.');});
    }
    async function BanKontrolu(tel){
      const user=firebase.auth().currentUser;if(!user?.emailVerified)return false;
      const epoch=banAuthNesli;
      try{const snap=await firebase.database().ref('HesapErisimleri/'+user.uid).once('value');if(epoch!==banAuthNesli||firebase.auth().currentUser?.uid!==user.uid)return true;const v=snap.val();if(v?.banned===true||v?.deleted===true){BanOturumunuKapat(user.uid,v.sebep||'Hesabınızın erişimi kapatıldı.');return true;}BanCanliDinle(tel);return isBannedUser;}
      catch(_){if(epoch===banAuthNesli)BanOturumunuKapat(user.uid,'Hesap erişimi doğrulanamadı. Bağlantıyı kontrol edin.');return true;}
    }

    function SistemAyarlariniDinle() {
        if(sistemAyarlariDinleyiciRef) sistemAyarlariDinleyiciRef.off();
        sistemAyarlariDinleyiciRef = firebase.database().ref('DukkanDurumu');
        sistemAyarlariDinleyiciRef.on('value', (snapshot) => {
            let data = snapshot.val(); if(!data) return;
            
            // Canlı Çark Ödüllerini Çek
            if(data.CarkOdulleri) {
                CARK_ODULLERI = data.CarkOdulleri;
                if(!wheelRequest&&document.getElementById('cark-popup').style.display!=='flex')WheelPaintRewards(CARK_ODULLERI);
            }

            let kapaliGun = data.kapaliGun || "Yok"; let acilKapat = data.acilKapat === true || (typeof data.acilKapat === "string" && data.acilKapat.trim().toLowerCase() === "true");

            let currentDay = new Date().toLocaleDateString("en-US", {weekday: "long",timeZone:"Europe/Istanbul"});
            let isClosedToday = (currentDay === kapaliGun) || acilKapat;
            
            let overlay = document.getElementById("store-closed-overlay"); let userUI = document.getElementById("main-user-ui");
            if (isClosedToday && !isBannedUser) {
                isStoreClosed = true; if(userUI) userUI.style.display = "none";
                if(overlay) { overlay.style.display = "flex"; document.getElementById("store-closed-msg").innerText = acilKapat ? "Beklenmedik bir durum sebebiyle şu an sipariş alamıyoruz." : "Bugün dinleniyoruz. Yarın tekrar hizmetinizdeyiz!"; }
            } else if (!isClosedToday && !isBannedUser) {
                isStoreClosed = false; if(overlay) overlay.style.display = "none"; if(userUI) userUI.style.display = "block";
            }
        });

        if (bildirimDinleyiciRef) bildirimDinleyiciRef.off();
        bildirimDinleyiciRef = firebase.database().ref('SistemBildirimleri/GenelBildirim');
        bildirimDinleyiciRef.on('value', async (snapshot) => {
            let bildirim = snapshot.val();
            if (bildirim && bildirim.ts) {
                let sonGosterilen = await SecureOku("bg_last_notif_ts");
                const zaman = Number(bildirim.ts);
                if (Number.isFinite(zaman) && zaman > 0 && Date.now()-zaman >= 0 && Date.now()-zaman < 86400000 &&
                    (!sonGosterilen || Number(sonGosterilen) < zaman) && !isBannedUser) {
                    await SecureKaydet('bg_last_notif_ts', String(zaman));
                    const baslik=String(bildirim.baslik||'Bekmez GO').slice(0,80);
                    const mesaj=String(bildirim.mesaj||'').slice(0,500);
                    OzelUyariGoster(baslik, escapeHTML(mesaj), '📢');
                    BildirimGonder(baslik, mesaj, true, 'firsatlar');
                }
            }
        });
    }

    // ==========================================
    // 4. MÜŞTERİ AUTH, KAYIT VE PROFİL
    // ==========================================
    function AuthModuDegistir(mod) {
        HapticTitresim(); let slider = document.getElementById("auth-toggle-slider"); let btns = document.querySelectorAll(".premium-toggle-btn"); let loginForm = document.getElementById("login-form-area"); let registerForm = document.getElementById("register-form-area"); let secBadge = document.getElementById("auth-security-badge");
        btns.forEach(b => b.classList.remove("active"));
        if (mod === 'login') {
            if(slider) slider.style.transform = "translateX(0%)"; if(btns[0]) btns[0].classList.add("active");
            if(loginForm) { loginForm.style.display = "block"; setTimeout(() => loginForm.classList.add("fade-up-enter"), 10); }
            if(registerForm) { registerForm.style.display = "none"; registerForm.classList.remove("fade-up-enter"); }
            if(secBadge) secBadge.style.display = "none";
        } else {
            if(slider) slider.style.transform = "translateX(100%)"; if(btns[1]) btns[1].classList.add("active");
            if(registerForm) { registerForm.style.display = "block"; setTimeout(() => registerForm.classList.add("fade-up-enter"), 10); }
            if(loginForm) { loginForm.style.display = "none"; loginForm.classList.remove("fade-up-enter"); }
            if(secBadge) secBadge.style.display = "flex";
        }
    }

    function DashboardSekmeSec(sekme) {
        HapticTitresim(); document.querySelectorAll(".premium-dash-tab").forEach(t => t.classList.remove("active")); document.querySelectorAll(".dash-content").forEach(c => { c.style.display = "none"; c.classList.remove("fade-up-enter"); });
        let btn = document.getElementById(`tab-${sekme}`); if(btn) btn.classList.add("active");
        let seciliAlan = document.getElementById(`dash-${sekme.toLowerCase()}-alani`); if(seciliAlan) { seciliAlan.style.display = "block"; setTimeout(() => seciliAlan.classList.add("fade-up-enter"), 10); }
    }

    function ProfilArayuzunuGuncelle(isLoggedIn, userName = "") {
        if (isLoggedIn && (isBannedUser || !firebase.auth().currentUser)) return;
        let anaBaslik = document.getElementById("profil-ana-baslik"); let altBaslik = document.getElementById("profil-alt-baslik"); let authWrapper = document.getElementById("auth-wrapper"); let dashboardWrapper = document.getElementById("dashboard-wrapper");
        if (isLoggedIn) {
            let kisaAd = userName && userName.trim() !== "" ? userName.trim().split(' ')[0] : "Müşterimiz";
            if(anaBaslik) anaBaslik.innerHTML = `Hoş Geldin, <span style="color:var(--primary);">${escapeHTML(kisaAd)}</span> ✨`;
            if(altBaslik) altBaslik.innerText = "Sipariş adresini ve hesap ayarlarını yönetebilirsin.";
            if(authWrapper) authWrapper.style.display = "none";
            if(dashboardWrapper) { dashboardWrapper.style.display = "block"; DashboardSekmeSec('Teslimat'); }
            let chkIsim = document.getElementById("chk-isim"); if(chkIsim && !chkIsim.value) chkIsim.value = userName;
        } else {
            if(anaBaslik) anaBaslik.innerText = "Hesabım";
            if(altBaslik) altBaslik.innerText = "Sipariş vermek için giriş yapın veya kayıt olun.";
            if(dashboardWrapper) dashboardWrapper.style.display = "none";
            if(authWrapper) { authWrapper.style.display = "block"; AuthModuDegistir('login'); }
        }
    }

    async function GirisYapTetikle() {
        let email = document.getElementById("login-email").value.trim().toLowerCase(); let pass = document.getElementById("login-pass").value; let btn = document.querySelector("#login-form-area .premium-submit-btn");
        if(!email || !pass) { OzelUyariGoster("Eksik Bilgi", "Lütfen e-posta ve şifrenizi girin.", "⚠"); return; }
                
        btn.disabled = true; btn.innerHTML = `<div class="spinner-small"></div> Giriş Yapılıyor...`;

        try {
            await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            let userCred = await firebase.auth().signInWithEmailAndPassword(email, pass); let user = userCred.user; if (user.uid === 'jO9Jmp2cgXfGUfMVbv5fdlCPgV52') { await firebase.auth().signOut(); OzelUyariGoster('Kasa hesabı', 'Yönetim Windows kasa uygulamasına taşındı. Müşteri hesabınızla giriş yapın.', '🔒'); return; }
            document.getElementById('login-pass').value='';
            

            let foundTel = user.displayName;
            if (!foundTel || foundTel.length < 10) {
                const own=await CustomerService('/profile/find',{});foundTel=own.telefon;
            }
            if(foundTel && foundTel.length >= 10) { let isBan = await BanKontrolu(foundTel); if(isBan) { await firebase.auth().signOut(); btn.disabled = false; btn.innerText = "Giriş Yap"; return; } await BasariliGirisIslemleri(foundTel, email, true); } 
            else { firebase.auth().signOut(); OzelUyariGoster("Güvenlik Güncellemesi", "Sistem güvenliği nedeniyle telefon numaranız eşleşmedi. Lütfen tekrar kayıt olun.", "🛡️"); AuthModuDegistir('register'); }
        } catch(e) { OzelUyariGoster('Giriş tamamlanamadı',escapeHTML(e.code?.startsWith('auth/')?'E-posta ve şifrenizi kontrol edin.':e.message||'Hesabınız doğrulanamadı.'),'ℹ'); }
        finally {
            document.getElementById('login-pass').value='';
            btn.disabled = false; btn.innerText = "Giriş Yap";
        }
    }

    function FormatTelefon(input) { let val = input.value.replace(/[^0-9]/g, ''); if (val.startsWith('0')) { val = val.substring(1); } if (val.length > 10) { val = val.substring(0, 10); } input.value = val; let chk = document.getElementById('chk-telefon'); if (chk) chk.value = val; }

    let isPasswordValid = false;
    function CanliSifreKontrolu(val) {
        let rL = /[a-z]/.test(val) || /[çğıöşü]/.test(val); let rU = /[A-Z]/.test(val) || /[ÇĞİÖŞÜ]/.test(val); let rN = /[0-9]/.test(val); let rS = /[^A-Za-z0-9çğıöşüÇĞİÖŞÜ]/.test(val); let rLen = val.length >= 8;
        const updateRule = (id, isValid, text) => { let el = document.getElementById(id); if (!el) return; if (isValid) { el.className = 'rule-item valid'; el.innerHTML = `<span class="rule-icon">✅</span> ${text}`; } else { el.className = 'rule-item'; el.innerHTML = `<span class="rule-icon">❌</span> ${text}`; } };
        updateRule('rule-lower', rL, 'En az bir küçük harf'); updateRule('rule-upper', rU, 'En az bir büyük harf'); updateRule('rule-number', rN, 'En az bir rakam'); updateRule('rule-special', rS, 'En az bir özel karakter (@, #, $ vb.)'); updateRule('rule-length', rLen, 'En az 8 karakter uzunluğunda');
        isPasswordValid = rL && rU && rN && rS && rLen; let rb = document.getElementById('password-rules-box'); if (val.length > 0) { rb.style.display = "block"; } else { rb.style.display = "none"; }
        KayitOnayToggle();
    }

    function KayitOnayToggle() { let cb = document.getElementById("kayit-onay-cb"); let btn = document.getElementById("btn-email-verify"); if (cb && btn) { if (cb.checked && isPasswordValid) { btn.disabled = false; btn.style.opacity = "1"; } else { btn.disabled = true; btn.style.opacity = "0.5"; } } }

    firebase.auth().onAuthStateChanged(async (user) => {
        WheelResetSession();
        void CarkDurumunuKontrolEt();
        ++banAuthNesli;
        BanDinlemeyiDurdur();
        const authEpoch = banNesli;
        if (user) { isBannedUser = false; const overlay = document.getElementById('banned-user-overlay'); if (overlay) overlay.style.display = 'none'; }
        if (user?.emailVerified && user.uid !== 'jO9Jmp2cgXfGUfMVbv5fdlCPgV52') {
            const tel = user.displayName || await SecureOku('bg_t');
            if (authEpoch !== banNesli || firebase.auth().currentUser?.uid !== user.uid) return;
            if (await BanKontrolu(tel)) return;
        }
        // Dinleyiciler başlangıçta anonim açılmışsa oturum değişince yeniden yetkilendir.
        if (document.readyState !== 'loading') SistemAyarlariniDinle();
        if (user) {
            if (user.uid === 'jO9Jmp2cgXfGUfMVbv5fdlCPgV52') { await firebase.auth().signOut(); OzelUyariGoster('Kasa hesabı', 'Yönetim Windows kasa uygulamasına taşındı. Müşteri hesabınızla giriş yapın.', '🔒'); return; }
            
            let bekleyenTel = await SecureOku("bg_pending_tel"); let bekleyenEmail = await SecureOku("bg_pending_email");
            if (isBannedUser || firebase.auth().currentUser?.uid !== user.uid) return;
            if (bekleyenTel && bekleyenEmail && user.email === bekleyenEmail) { await user.reload(); if (user.emailVerified) { IptalEtEpostaBekleme(false); SayfaGoster('profil'); WhatsappDoğrulamasiniBaslat(bekleyenTel, bekleyenEmail); } else { EpostaOnayiniBekle(user, bekleyenTel, bekleyenEmail); } }
            else if(user.emailVerified&&(user.displayName||await SecureOku('bg_t')))await BasariliGirisIslemleri(user.displayName||await SecureOku('bg_t'),user.email,true,true);
        }
    });

    async function YeniNesilKayitOl() {
        if (!isPasswordValid) { OzelUyariGoster("Zayıf Şifre", "Lütfen şifre gereksinimlerinin tamamını karşılayın.", "🔒"); return; }
        let telInput = document.getElementById("prof-telefon").value.replace(/[^0-9]/g, ''); let emailInput = document.getElementById("prof-email").value.trim().toLowerCase(); let passInput = document.getElementById("prof-password").value; let btn = document.getElementById("btn-email-verify");
        if(telInput.length < 10) { OzelUyariGoster("Eksik Numara", "Lütfen başında 0 olmadan tam 10 haneli numaranızı girin.", "📱"); return; }
        if(emailInput.length < 5 || !emailInput.includes("@")) { OzelUyariGoster("Eksik E-Posta", "Lütfen geçerli bir e-posta adresi girin.", "📧"); return; }
        if(!emailInput.endsWith("@gmail.com")) { OzelUyariGoster("Sadece Gmail", "Sadece @gmail.com adresleri kabul edilmektedir.", "🛑"); return; }
        
        let formatliTel = "0" + telInput; let autoPass = passInput; btn.innerHTML = `<div class="spinner-small"></div> Kontrol Ediliyor...`; btn.disabled = true;
        try {
            let banliMi = await BanKontrolu(formatliTel); if(banliMi) { btn.innerText = "Hesabımı Oluştur"; btn.disabled = false; return; }

            try { let userCred = await firebase.auth().createUserWithEmailAndPassword(emailInput, autoPass); await userCred.user.sendEmailVerification(); await SecureKaydet("bg_pending_tel", formatliTel); await SecureKaydet("bg_pending_email", emailInput); EpostaOnayiniBekle(userCred.user, formatliTel, emailInput); } catch (error) { if (error.code === 'auth/email-already-in-use') { try { let userCred = await firebase.auth().signInWithEmailAndPassword(emailInput, autoPass); await handleVerifiedUser(userCred, formatliTel, emailInput); } catch(loginErr) { btn.innerText = "Hesabımı Oluştur"; btn.disabled = false; OzelUyariGoster("E-Posta Uyuşmazlığı", "Bu e-posta adresi başka bir hesaba ait veya şifrenizi yanlış girdiniz.", "❌"); } } else { btn.innerText = "Hesabımı Oluştur"; btn.disabled = false; OzelUyariGoster("Kayıt Hatası", escapeHTML(error.message), "❌"); } }
        } catch (e) { btn.innerText = "Hesabımı Oluştur"; btn.disabled = false; OzelUyariGoster("İşlem Başarısız", "Bağlantı hatası oluştu.", "📡"); }
    }

    async function handleVerifiedUser(userCred, formatliTel, emailInput) { if(userCred.user.emailVerified) { await WhatsappDoğrulamasiniBaslat(formatliTel, emailInput, true); } else { await userCred.user.sendEmailVerification(); await SecureKaydet("bg_pending_tel", formatliTel); await SecureKaydet("bg_pending_email", emailInput); EpostaOnayiniBekle(userCred.user, formatliTel, emailInput); } }

    function EpostaOnayiniBekle(user, formatliTel, email) {
        let p = document.getElementById("email-wait-overlay"); p.style.display = "flex"; setTimeout(() => p.classList.add("active"), 10);
        if(emailInterval) clearInterval(emailInterval); emailInterval = setInterval(async () => { try { await user.reload(); if (user.emailVerified) { await user.getIdToken(true);clearInterval(emailInterval); p.classList.remove("active"); setTimeout(() => p.style.display = "none", 400); WhatsappDoğrulamasiniBaslat(formatliTel, email); } } catch(e) {} }, 3000);
    }

    async function IptalEtEpostaBekleme(tamamenIptal = false) {
        if(emailInterval) clearInterval(emailInterval);
        if(tamamenIptal) { await SecureSil("bg_pending_tel"); await SecureSil("bg_pending_email"); let user = firebase.auth().currentUser; if(user) { await firebase.auth().signOut(); } }
        let p = document.getElementById("email-wait-overlay"); if(p) { p.classList.remove("active"); setTimeout(() => p.style.display = "none", 400); } let btn = document.getElementById("btn-email-verify"); if(btn) { btn.innerText = "Hesabımı Oluştur"; btn.disabled = false; }
    }

    let phoneVerificationRef=null,phoneVerificationTimer=null,phoneVerificationOpening=false;
    function PhoneVerificationStop(){if(phoneVerificationRef){phoneVerificationRef.off();phoneVerificationRef=null;}if(phoneVerificationTimer){clearTimeout(phoneVerificationTimer);phoneVerificationTimer=null;}}
    async function WhatsappDoğrulamasiniBaslat(formatliTel,email,isLogin=false){
      if(phoneVerificationOpening)return;phoneVerificationOpening=true;
      try{
        const phone=SiparisTelefonunuStandartlastir(formatliTel),user=WheelSession();if(!user)return;
        const epoch=wheelSessionEpoch,result=await CustomerService('/profile/verification',{telefon:phone});
        if(!WheelStillCurrent(user,epoch))return;
        if(result.verified){await BasariliGirisIslemleri(phone,email,true);return;}
        if(!/^BKMZ-[A-F0-9]{32}$/.test(result.code||''))throw new Error('Doğrulama yanıtı geçersiz.');
        aktifWhatsappKodu=result.code;aktifWhatsappNumarasi=phone.slice(1);
        await SecureKaydet('bg_wp_kod',result.code);await SecureKaydet('bg_pending_tel',phone);await SecureKaydet('bg_pending_email',user.email);
        let overlay=document.getElementById('whatsapp-wait-overlay');if(!overlay){overlay=document.createElement('div');overlay.id='whatsapp-wait-overlay';overlay.className='custom-alert-overlay';document.body.appendChild(overlay);}
        overlay.style.zIndex='65000';overlay.innerHTML=`<div class="custom-alert-box"><div class="custom-alert-content"><h3>Telefonunuzu doğrulayın</h3><p style="line-height:1.6;color:var(--text-muted)">WhatsApp düğmesine basıp hazır mesajı kendi numaranızdan gönderin. İşletme, gönderen numarayı kontrol edip kasadan onay verecek. Bu ekran onay geldiğinde kendiliğinden kapanır.</p><div style="padding:16px;border:1px dashed var(--border-highlight);border-radius:14px;overflow-wrap:anywhere;font:600 14px monospace">${escapeHTML(result.code)}</div><p style="color:var(--text-muted);font-size:12px">Kod 10 dakika geçerlidir. Mesajı ${escapeHTML(phone)} numarasından gönderin.</p><button id="wp-onay-btn" class="premium-submit-btn" data-bkm-click="a71">WhatsApp mesajını gönder</button><button class="alert-btn" data-bkm-click="a72">Şimdilik kapat</button><div id="wp-dinleme-yazisi" style="display:none;margin-top:12px;color:var(--success)">İşletmenin onayı bekleniyor…</div></div></div>`;
        overlay.style.display='flex';setTimeout(()=>overlay.classList.add('active'),10);
        PhoneVerificationStop();phoneVerificationRef=firebase.database().ref('DogrulamaIstekleri/'+user.uid);
        let completing=false;
        phoneVerificationRef.on('value',async snapshot=>{
          if(!WheelStillCurrent(user,epoch)||completing)return;
          const record=snapshot.val();if(record?.code!==result.code)return;
          if(record.state==='approved'){completing=true;PhoneVerificationStop();overlay.classList.remove('active');overlay.style.display='none';await BasariliGirisIslemleri(phone,email,isLogin);}
        },()=>{PhoneVerificationStop();OzelUyariGoster('Doğrulama bağlantısı kesildi','Sayfayı yenileyip aynı hesabınızla devam edin.','ℹ');});
        phoneVerificationTimer=setTimeout(()=>{PhoneVerificationStop();const text=document.getElementById('wp-dinleme-yazisi');if(text){text.style.display='block';text.textContent='Kodun süresi doldu. Kapatıp yeniden doğrulama başlatabilirsiniz.';}},Math.max(1000,result.expiresAt-Date.now()));
      }catch(e){OzelUyariGoster('Telefon doğrulanamadı',escapeHTML(e.message||'Bağlantınızı kontrol edin.'),'ℹ');}
      finally{phoneVerificationOpening=false;const button=document.getElementById('btn-email-verify');if(button){button.disabled=false;button.textContent='Hesabımı Oluştur';}}
    }

    async function WhatsappIkinciDoğrulama(formatliTel, email, isLogin) { if(isLogin) { await BasariliGirisIslemleri(formatliTel, email, true); return; } WhatsappDoğrulamasiniBaslat(formatliTel, email); }

    async function WhatsappMesajiGonder() { HapticTitresim(); let dinlemeYazisi = document.getElementById("wp-dinleme-yazisi"); if (dinlemeYazisi) dinlemeYazisi.style.display = "block"; let btn = document.getElementById("wp-onay-btn"); if (btn) { btn.innerHTML = `<div class="spinner-small"></div> <span style="vertical-align:middle;">Onay Bekleniyor...</span>`; btn.style.background = "#1da851"; btn.style.boxShadow = "0 0 15px rgba(37, 211, 102, 0.8)"; } let mesaj = "Merhaba Bekmez GO. Hesabımı onaylamak için kodum: " + aktifWhatsappKodu; let url = `https://wa.me/${DUKKAN_WHATSAPP_NUMARASI}?text=${encodeURIComponent(mesaj)}`; await SecureKaydet("bg_wp_waiting", "true"); window.location.href = url; }

    async function IptalEtWhatsappBekleme() { PhoneVerificationStop(); if(whatsappInterval) clearInterval(whatsappInterval); let wpOverlay = document.getElementById("whatsapp-wait-overlay"); if (wpOverlay) { wpOverlay.classList.remove("active"); setTimeout(() => wpOverlay.style.display = "none", 400); } let btn = document.getElementById("btn-email-verify"); if(btn) { btn.innerText = "Hesabımı Oluştur"; btn.disabled = false; } await SecureSil("bg_wp_waiting"); await SecureSil("bg_wp_kod"); await SecureSil("bg_pending_tel"); await SecureSil("bg_pending_email"); let user = firebase.auth().currentUser; if (user) { /* Doğrulama iptali mevcut hesabı silmez. */ } firebase.auth().signOut(); OzelUyariGoster("İptal Edildi", "WhatsApp onayı yapılmadığı için işlem iptal edildi.", "❌"); }

    let profileSyncRequest=null;
    function SyncCustomerProfile(phone){
      const user=WheelSession(),epoch=wheelSessionEpoch;if(!user)return Promise.reject(new Error('Müşteri oturumu gerekli.'));
      if(profileSyncRequest?.uid===user.uid&&profileSyncRequest.phone===phone&&profileSyncRequest.epoch===epoch&&profileSyncRequest.until>Date.now())return profileSyncRequest.promise;
      const entry={uid:user.uid,phone,epoch,until:Date.now()+30000};
      entry.promise=CustomerService('/profile/sync',{telefon:phone}).catch(error=>{if(profileSyncRequest===entry)profileSyncRequest=null;throw error;});profileSyncRequest=entry;return entry.promise;
    }
    async function BasariliGirisIslemleri(formatliTel,email,isLogin=false,silent=false){
      const user=WheelSession();if(!user)return false;
      try{
        const phone=SiparisTelefonunuStandartlastir(formatliTel),epoch=wheelSessionEpoch;
        const result=await SyncCustomerProfile(phone);if(!WheelStillCurrent(user,epoch))return false;
        if(user.displayName!==phone)await user.updateProfile({displayName:phone});
        const profile=result.profile||{};
        await SecureKaydet('bg_t',phone);await SecureKaydet('bg_i',profile.isim||'');await SecureKaydet('bg_a',profile.adres||'');
        for(const key of ['bg_wp_waiting','bg_wp_kod','bg_pending_tel','bg_pending_email'])await SecureSil(key);
        for(const [id,value] of [['prof-isim',profile.isim||''],['chk-isim',profile.isim||''],['prof-adres',profile.adres||''],['chk-adres',profile.adres||''],['chk-telefon',phone.slice(1)]]){const el=document.getElementById(id);if(el)el.value=value;}
        const order=profile.aktifSiparis;
        if(order?.siparisId){await SecureKaydet('bg_active_order_id',order.siparisId);if(Number.isFinite(order.timestamp))await SecureKaydet('bg_order_timestamp',ZamanMuhruKodla(order.timestamp,order.siparisId));if(order.odemeTuru)await SecureKaydet('bg_odeme_turu',order.odemeTuru);}else await SecureSil('bg_active_order_id');
        BanCanliDinle(phone);ProfilArayuzunuGuncelle(true,profile.isim||'');await CarkDurumunuKontrolEt();PushSepetDurumuYansit();
        if(!silent)OzelUyariGoster(isLogin?'Hoş geldiniz':'Hesabınız doğrulandı',isLogin?'Hesabınıza giriş yapıldı.':'Telefon ve e-posta doğrulamanız tamamlandı. Ad ve teslimat adresinizi kaydedebilirsiniz.','✅');
        if(order?.siparisId){await SiparisDurumBildiriminiBaslat(order.siparisId);if(!silent)SayfaGoster('gecmis');}
        return true;
      }catch(e){OzelUyariGoster('Hesap doğrulanamadı',escapeHTML(e.message||'Sunucuya ulaşılamadı. Kaydınız değiştirilmedi.'),'ℹ');return false;}
    }
    async function ProfiliKaydet(alertGoster=true){
      const user=WheelSession();if(!user){if(alertGoster)OzelUyariGoster('Giriş yapın','Bilgilerinizi kaydetmek için doğrulanmış müşteri hesabınızla giriş yapın.','🔒');return false;}
      try{
        const phone=SiparisTelefonunuStandartlastir(await SecureOku('bg_t')),isim=document.getElementById('prof-isim')?.value.trim()||'',adres=document.getElementById('prof-adres')?.value.trim()||'';
        await CustomerService('/profile/update',{telefon:phone,isim,adres});
        await SecureKaydet('bg_i',isim);await SecureKaydet('bg_a',adres);for(const [id,value]of [['chk-isim',isim],['chk-adres',adres]]){const el=document.getElementById(id);if(el)el.value=value;}
        if(alertGoster){ProfilArayuzunuGuncelle(true,isim);OzelUyariGoster('Kaydedildi','Profil bilgileriniz sunucuya kaydedildi.','✅');}return true;
      }catch(e){if(alertGoster)OzelUyariGoster('Kaydedilemedi',escapeHTML(e.message||'Bağlantınızı kontrol edin. Önceki kaydınız korunuyor.'),'ℹ');return false;}
    }

    function SadeceCikisYap() { SoruSor("Oturumu Kapat", "Cihazınızdaki mevcut oturumu kapatmak istediğinize emin misiniz?", "🚪", async () => { HapticTitresim(); document.body.insertAdjacentHTML("beforeend", `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-weight:bold;backdrop-filter:blur(10px);"><div class="spinner"></div><div style="margin-top:20px; font-size:18px;">Güvenli Çıkış Yapılıyor...</div></div>`); await TemizleOturumVerileri(); }, false); }

    async function TemizleOturumVerileri() { try { await PushCihazKaydiniSil(); await BekmezSecurity.clearPrivateData(); if(firebase.auth().currentUser) { await firebase.auth().signOut(); } localStorage.clear(); sessionStorage.clear();  setTimeout(() => { window.location.reload(true); }, 800); } catch(e) { localStorage.clear(); window.location.reload(true); } }

    async function HesabiTamamenSil(){
      const user=WheelSession();if(!user)return;
      SoruSor('Hesabı sil','Profiliniz kapatılacak. Devam eden sipariş varsa silme yapılamaz. Tamamlanan sipariş ve mali kayıtlar işletmenin saklama politikasına tabidir. Devam edilsin mi?','⚠️',async()=>{
        let overlay;
        try{
          const info=await user.getIdTokenResult(false);if(!Number.isFinite(Number(info.claims.auth_time))||Date.now()/1000-Number(info.claims.auth_time)>300){OzelUyariGoster('Yeniden giriş gerekli','Hesap silmeden önce çıkış yapıp tekrar giriş yapın; ardından silme işlemini yeniden başlatın.','🔒');return;}
          overlay=document.createElement('div');overlay.className='custom-alert-overlay active';overlay.style.cssText='display:flex;z-index:65000';const message=document.createElement('div');message.className='custom-alert-box';message.textContent='Hesabınız kapatılıyor…';overlay.appendChild(message);document.body.appendChild(overlay);
          const phone=SiparisTelefonunuStandartlastir(await SecureOku('bg_t'));await CustomerService('/profile/delete',{telefon:phone,confirm:'HESABIMI_SIL'});
          try{await user.delete();}catch(_){if(overlay)overlay.remove();OzelUyariGoster('Profil kapatıldı','Profilinizin sipariş erişimi kapatıldı. Firebase giriş hesabının silinmesi tamamlanamadı; işletmeyle iletişime geçin.','ℹ');await firebase.auth().signOut();return;}
          await TemizleOturumVerileri();
        }catch(e){if(overlay)overlay.remove();OzelUyariGoster('Hesap silinemedi',escapeHTML(e.message||'Bağlantınızı kontrol edin. İşlem tamamlanmadı.'),'ℹ');}
        finally{if(overlay)overlay.remove();}
      },true);
    }
    // ==========================================
    // 5. MENÜ LİSTELEME VE ÇARK BAŞLANGICI
    // ==========================================

    // KRİTİK HATA ÖNLEYİCİ: Eğer JS'de bir hata olursa ekranın kilitli kalmaması için zorunlu kapatıcı
    setTimeout(() => {
        let splash = document.getElementById('splash-screen');
        if (splash && splash.style.display !== 'none') {
            splash.style.opacity = '0';
            setTimeout(() => { splash.style.display = 'none'; }, 400);
        }
    }, 3500);

    window.addEventListener('DOMContentLoaded', async () => {
        BildirimDurumunuGuncelle();
        
        try {
            SyncServerTime(); 
            if(typeof SistemAyarlariniDinle === "function") SistemAyarlariniDinle();
            
            let kt = null; try { kt = await SecureOku("bg_t"); } catch(e) {}
            if (kt && kt !== "") { let banCheck = await BanKontrolu(kt); if(banCheck) return; }

            let isWaitingWp = null, pTel = null, pMail = null;
            try { isWaitingWp = await SecureOku("bg_wp_waiting"); pTel = await SecureOku("bg_pending_tel"); pMail = await SecureOku("bg_pending_email"); } catch(e) {}

            if (isWaitingWp === "true" && pTel && pMail) {
                let splash = document.getElementById('splash-screen'); if (splash) { splash.style.display = 'none'; splash.style.opacity = '0'; }
                SayfaGoster('profil'); WhatsappDoğrulamasiniBaslat(pTel, pMail);
            } else {
                let st = new Date().getHours(); let m = "Hoş Geldiniz ✨"; 
                if (st >= 5 && st < 11) m = "Günaydın ☀️"; else if (st >= 11 && st < 17) m = "İyi Günler 🌤️"; else if (st >= 17 && st < 22) m = "İyi Akşamlar 🌙"; else m = "İyi Geceler 🌌";
                let ko = document.getElementById("dinamik-karsilama"); if(ko) ko.innerText = m;
                setTimeout(() => { SplashKapatSinematik(); }, 2500);
            }

            let ki = null, ka = null;
            try { ki = await SecureOku("bg_i"); ka = await SecureOku("bg_a"); } catch(e) {}
            
            if (kt && WheelSession()) { 
                ProfilArayuzunuGuncelle(true, ki || "");
                let displayTel = kt.startsWith("0") ? kt.substring(1) : kt;
                let chkTel = document.getElementById("chk-telefon"); if (chkTel) chkTel.value = displayTel; 

                try {
                    let authUser = firebase.auth().currentUser;
                    if (authUser) {
                        
                        const sync=await SyncCustomerProfile(SiparisTelefonunuStandartlastir(kt));
                        let adisyonData=sync.profile?.aktifSiparis;
                        if(adisyonData && adisyonData.siparisId) {
                            await SecureKaydet("bg_active_order_id", adisyonData.siparisId);
                            if(Number.isFinite(adisyonData.timestamp))await SecureKaydet("bg_order_timestamp",ZamanMuhruKodla(adisyonData.timestamp,adisyonData.siparisId));else if(adisyonData.zamanMuhru)await SecureKaydet("bg_order_timestamp",adisyonData.zamanMuhru);
                            if(adisyonData.odemeTuru) await SecureKaydet("bg_odeme_turu", adisyonData.odemeTuru);
                        } else { await SecureSil("bg_active_order_id"); }
                    }
                } catch(e) {}
            } else { ProfilArayuzunuGuncelle(false); }
            
            if(ki) { let pI = document.getElementById("prof-isim"); let cI = document.getElementById("chk-isim"); if(pI) pI.value = ki; if(cI) cI.value = ki; }
            if(ka) { let pA = document.getElementById("prof-adres"); let cA = document.getElementById("chk-adres"); if(pA) pA.value = ka; if(cA) cA.value = ka; }

            await CanliMenuCek(true); MenuyuGercekZamanliDinle();
            try { await SiparisDurumBildiriminiBaslat(await SecureOku('bg_active_order_id')); } catch (_) {} 
            
            setInterval(async () => { if(document.getElementById("opportunities-container").style.display === "block" && !isBannedUser) { await KuponlariCek(); } }, 30000);
            
            try { let kS = await SecureOku("bg_saved_cart"); if(kS) { sepet = JSON.parse(kS); if(sepet.length > 0) { document.getElementById("nav-sepet-badge").innerText = sepet.length; document.getElementById("nav-sepet-badge").classList.add("show"); document.getElementById("floating-cart").style.display = "flex"; HesaplaVeGuncelle(); } } } catch(e) {}
            PushSepetDurumuYansit();
            try { const savedGift=await SecureOku("bg_saved_cark"); if(await WheelRestoreGift(savedGift))await HesaplaVeGuncelle(); } catch(e) {}
        } catch (hata) { SplashKapatSinematik(); }
    });

    async function SplashKapatSinematik() { 
        let splash = document.getElementById('splash-screen'); 
        if (splash && splash.style.display !== "none") { 
            let c = document.getElementById('splash-content'); 
            if(c) { c.style.transform = 'scale(1.15)'; c.style.opacity = '0'; }
            setTimeout(async () => { 
                splash.style.opacity = '0'; 
                setTimeout(async () => { 
                    splash.style.display = 'none'; 
                    if(isBannedUser) return;
                    try {
                        let siparisId = await SecureOku("bg_active_order_id");
                        if(siparisId) {
                            let authUser = firebase.auth().currentUser; let urlStr = `${FIREBASE_URL}/CanliPaketler/${siparisId}.json`; let taslakUrl = `${FIREBASE_URL}/SiparisTaslaklari/${siparisId}.json`;
                            if(authUser) { let idToken = await authUser.getIdToken(false); urlStr += `?auth=${idToken}`; taslakUrl += `?auth=${idToken}`; }
                            let res = await fetch(urlStr); let tRes = await fetch(taslakUrl); if(!res.ok||!tRes.ok)throw new Error("Sipariş bilgisi alınamadı"); let d=await res.json(); let tD=await tRes.json();
                            
                            if ((!d || d.error) && (!tD || tD.error)) { await SecureSil("bg_active_order_id"); await SecureSil("bg_last_status"); SayfaGoster('urunler'); return; }

                            let sipZamani = (d && d.timestamp) ? d.timestamp : ((tD && tD.timestamp) ? tD.timestamp : null); 
                            let isGhost = sipZamani ? ((Date.now() - sipZamani) > GHOST_TIMEOUT_MS) : false;
                            if(d && d.durum && !d.durum.includes("İPTAL") && !d.durum.includes("RED") && !d.durum.includes("TESLİM") && !d.durum.includes("AFİYET") && !isGhost) { SayfaGoster('gecmis'); } else { SayfaGoster('urunler'); }
                        } else { SayfaGoster('urunler'); }
                    } catch(e) { SayfaGoster('urunler'); }
                }, 800); 
            }, 400); 
        } 
    }

    function SayfaGoster(s) {
        if(isStoreClosed || isBannedUser) return;
        HapticTitresim(); SessizIzinIste(); if (aktifAdisyonDinleyiciRef) { aktifAdisyonDinleyiciRef.off(); aktifAdisyonDinleyiciRef = null; }
        document.getElementById("menu-container").style.display = "none"; document.getElementById("cart-container").style.display = "none"; document.getElementById("profile-container").style.display = "none"; document.getElementById("history-container").style.display = "none"; document.getElementById("opportunities-container").style.display = "none"; document.getElementById("floating-cart").style.display = "none";
        document.querySelectorAll('.nav-item').forEach(el => { el.classList.remove('active'); el.removeAttribute('aria-current'); });
        let t = document.getElementById("nav-" + s);
        if (!t) { s = 'urunler'; t = document.getElementById('nav-urunler'); }
        if (t) { t.classList.add('active'); t.setAttribute('aria-current','page'); }

        if(s === 'urunler') { if(Date.now() - fotoSonCekilis > 120000) { FotoHaritasiniYenile().then(degisti => { if(degisti && document.getElementById('menu-container').style.display === 'block') FotoMusteriKartlariniTazele(); }); } document.getElementById("menu-container").style.display = "block"; if(sepet.length > 0 || aktifKullanilanCarkOdulu) document.getElementById("floating-cart").style.display = "flex"; } 
        else if (s === 'sepet') { document.getElementById("cart-container").style.display = "block"; SepetEkraniniCiz(); } 
        else if (s === 'profil') { document.getElementById("profile-container").style.display = "block"; } 
        else if (s === 'firsatlar') { document.getElementById("opportunities-container").style.display = "block"; KuponlariCek(); CarkDurumunuKontrolEt(); } 
        else if (s === 'gecmis') { document.getElementById("history-container").style.display = "block"; sonCekilenAdisyonHTML = ""; AdisyonuGercekZamanliDinle(); } 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }


    // ===========================================================
    // BEKMEZ GO - SUPABASE FOTOGRAF ENTEGRASYONU
    // Publishable key herkese aciktir; yetkiler sunucuda RLS ile denetlenir.
    // Firebase urun fiyati / stogu / kasa isleyisi degistirilmez.
    // ===========================================================
    const FOTO_SB_URL = "https://nwzxvksywfzpvxwvtypf.supabase.co";
    const FOTO_SB_PUBLIC_KEY = "sb_publishable_ly8sItQiSf-Sjr3OTVoKbQ_NG5-YUBe";
    const FOTO_SB_BUCKET = "Bekmez-GO Photos";
    const FOTO_TABLE = "bekmez_urun_fotograflari";
    // Clear only this project's previous photo-management sessions; customer cart/order data stays.
    for (const storageName of ['localStorage', 'sessionStorage']) {
        try {
            const storage=window[storageName];
            for (let i=storage.length-1;i>=0;i--) {
                const key=storage.key(i);
                if (key && (key.startsWith('sb-nwzxvksywfzpvxwvtypf-') || key.startsWith('bekmez-photo-'))) storage.removeItem(key);
            }
        } catch (_) {}
    }
    const oldFragment=new URLSearchParams(location.hash.slice(1));
    if(oldFragment.has('access_token') || oldFragment.has('refresh_token')) history.replaceState(null,'',location.pathname+location.search);
    function FotoUrunUrl(urunAdi) {
        const yol = fotoHaritasi[String(urunAdi || '').trim()];
        if(!yol || !/^products\/[0-9a-f-]{36}\.webp$/.test(yol)) return '';
        return FOTO_SB_URL+'/storage/v1/object/public/'+encodeURIComponent(FOTO_SB_BUCKET)+'/'+yol;
    }

    async function FotoHaritasiniYenile() {
        try {
            const response=await fetch(FOTO_SB_URL+'/rest/v1/'+encodeURIComponent(FOTO_TABLE)+'?select=urun_adi,dosya_yolu&limit=500',{headers:{apikey:FOTO_SB_PUBLIC_KEY,Authorization:'Bearer '+FOTO_SB_PUBLIC_KEY},cache:'no-store'});if(!response.ok)throw new Error('Fotoğraf listesi alınamadı');const data=await response.json();if(!Array.isArray(data)||data.length>500)throw new Error('Fotoğraf listesi geçersiz');
            const yeni = Object.create(null);
            for(const x of (data || [])) {
                if(typeof x.urun_adi==='string' && /^products\/[0-9a-f-]{36}\.webp$/.test(x.dosya_yolu || ''))
                    yeni[x.urun_adi.trim()] = x.dosya_yolu;
            }
            const eski = JSON.stringify(fotoHaritasi);
            fotoHaritasi = yeni;
            fotoSonCekilis = Date.now();
            return JSON.stringify(yeni) !== eski;
        } catch(e) {
            console.warn('Fotoğraf eşleştirmeleri henüz okunamıyor (SQL tablo kurulmuş mu?):', e.message);
            fotoSonCekilis = Date.now();
            return false;
        }
    }

    function FotoUrunResimHatasi(resim) {
        // Silinen/bozuk URL, kategoriye ozel standart yuvarlak simgeye doner.
        if(!resim || !resim.parentElement) return;
        const alan = resim.closest('.product-photo-area');
        const ikon = alan?.querySelector('.product-icon-wrapper');
        if(alan && ikon) alan.replaceWith(ikon);
    }

    // Müşteri uygulamaya geri geldiğinde silinen görsellerin simgeye dönmesini sağla.
    // Sürekli polling yerine görünürlük/odak değişimini kullan; ücretsiz kota dostu.
    let fotoOdakKontrolDevamEdiyor = false;
    async function FotoOdaklanincaKontrolEt() {
        if(fotoOdakKontrolDevamEdiyor || document.hidden ||
           document.getElementById('menu-container')?.style.display === 'none' ||
           Date.now() - fotoSonCekilis < 45000) return;
        fotoOdakKontrolDevamEdiyor = true;
        try {
            const degisti = await FotoHaritasiniYenile();
            if(degisti && document.getElementById('menu-container')?.style.display !== 'none')
                FotoMusteriKartlariniTazele();
        } finally { fotoOdakKontrolDevamEdiyor = false; }
    }
    document.addEventListener('visibilitychange', FotoOdaklanincaKontrolEt);
    window.addEventListener('focus', FotoOdaklanincaKontrolEt);

    function FotoMusteriKartlariniTazele() {
        
        const arama = (document.getElementById('search-input')?.value || '').trim().toLocaleLowerCase('tr-TR');
        const gorunenler = arama ? tumUrunler.filter(u => u.pName && u.pName.toLocaleLowerCase('tr-TR').includes(arama))
            : tumUrunler.filter(u => GetKategoriAd(u) === aktifKategori);
        EkranaUrunleriCiz(gorunenler);
    }

    async function CanliMenuCek(ilkYukleme) {
        if(isBannedUser) return;
        try {
            if (ilkYukleme) await FotoHaritasiniYenile();
            let pRes = await fetch(`${FIREBASE_URL}/PopulerUrunler.json?t=${Date.now()}`); let pD = await pRes.json(); if(pD && Array.isArray(pD)) populerUrunlerListesi = pD;
            let vRes = await fetch(`${FIREBASE_URL}/MenuVersion.json?t=${Date.now()}`); let vD = await vRes.json(); if (!ilkYukleme && vD && vD.v == sonMenuVersiyonu) return; if (vD) sonMenuVersiyonu = vD.v;

            let mRes = await fetch(`${FIREBASE_URL}/Menu.json?t=${Date.now()}`); let data = await mRes.json();
            let liste = (data && data.products) ? data.products : []; let yeniVeri = JSON.stringify(liste);

            if (sonMenuVerisi !== yeniVeri) {
                tumUrunler = liste; sonMenuVerisi = yeniVeri;
                if(seciliUrun){const latest=SepetUrununuBul(seciliUrun.pName);if(latest){seciliUrun=latest;seciliFiyat=UnityFiyatiniHesapla(latest,seciliMiktar);PopupStokButonlari();}else if(document.getElementById("product-popup").classList.contains("active"))PopupKapat();}
                IndirimleriKontrolEt(liste);
                let ekmek = tumUrunler.find(u => u.pName && u.pName.trim().toLocaleLowerCase('tr-TR') === ekmekUrunAdi.trim().toLocaleLowerCase('tr-TR')); 
                if (ekmek) { let pStr = (ekmek.price1Kg || "0").toString().replace(',', '.'); ekmekBirimFiyati = isNaN(parseFloat(pStr)) ? 0 : parseFloat(pStr); }

                let history = {}; try { let okunanGecmis = await SecureOku('bg_phist'); if (okunanGecmis && okunanGecmis !== "undefined" && okunanGecmis !== "null") history = JSON.parse(okunanGecmis); } catch (err) {}
                let historyUpdated = false; let mevcutUrunAdlari = tumUrunler.map(u => u.pName);
                for (let kayitliUrun in history) { if (!mevcutUrunAdlari.includes(kayitliUrun)) { delete history[kayitliUrun]; historyUpdated = true; } }

                if (historyUpdated) { await SecureKaydet('bg_phist', JSON.stringify(history)); }
                if (ilkYukleme) { document.getElementById("kategori-sekmeleri").style.display = "flex"; KategoriSec(aktifKategori); } 
                else { if (document.getElementById("menu-container").style.display === "block") { if (document.getElementById('tab-Arama').style.display === "flex") { UrunAra(); } else { KategoriSec(aktifKategori); } } }
            }
        } catch(error) { if (ilkYukleme && !isBannedUser) { document.getElementById("menu-grid").innerHTML = `<div class="empty-state-box">${emptyCartSVG}<p>Bağlantı Hatası!</p></div>`; } }
    }

    function GetKategoriAd(u) { try { if (u.categoryIndex !== undefined && u.categoryIndex !== null) { let c = parseInt(u.categoryIndex); if(c===1) return "İçecek"; if(c===2) return "Ekstra"; if(c===0) return "Ana Yemek"; } if (!u.pName) return "Ana Yemek"; let ad = u.pName.toString().toLocaleLowerCase('tr-TR'); if (ad.includes("cola") || ad.includes("ayran") || ad.includes("su") || ad.includes("şalgam") || ad.includes("fanta")) return "İçecek"; if (ad.includes("ekmek") || ad.includes("salata") || ad.includes("ezme") || ad.includes("patates")) return "Ekstra"; return "Ana Yemek"; } catch(e) { return "Ana Yemek"; } }

    let isPopupOpening = false;
    async function EkranaUrunleriCiz(urunListesi) {
        const gridContainer = document.getElementById("menu-grid"); gridContainer.innerHTML = ""; gridContainer.style.display = "grid";
        const aramaAktif = document.getElementById('tab-Arama')?.style.display === 'flex';
        const kategoriBasliklari = {'Ana Yemek':'Ana Yemekler','İçecek':'İçecekler','Ekstra':'Yan Lezzetler'};
        const bolumBasligi = document.getElementById('menu-section-title');
        if (bolumBasligi) bolumBasligi.textContent = aramaAktif ? 'Arama Sonuçları' : (kategoriBasliklari[aktifKategori] || 'Lezzetler');
        const sonucSayisi = document.getElementById('menu-result-count');
        if (sonucSayisi) sonucSayisi.textContent = `${urunListesi.length} ürün`;
        if(urunListesi.length === 0) { gridContainer.innerHTML = `<div class="empty-state-box">${emptyCartSVG}<p>Ürün bulunamadı</p></div>`; return; }

        let history = {}; try { let r = await SecureOku('bg_phist'); if(r) history = JSON.parse(r); } catch(e) { }

        urunListesi.forEach((ur, i) => {
            try {
                let tur = GetKategoriAd(ur); let icon = PremiumIcon(tur === "İçecek" ? "drink" : tur === "Ekstra" ? "side" : "food");
                let orjinalIndex = tumUrunler.findIndex(u => u.pName === ur.pName); if (orjinalIndex === -1) orjinalIndex = 0;
                
                let stok = UrunStogu(ur);
                let stokSifirMi = stok <= 0; let clickAction = stokSifirMi ? `OzelUyariGoster('Tükendi', 'Bu ürün şu an stoklarımızda kalmamıştır.', '🚫')` : `UrunPopupAc(${orjinalIndex})`;

                let p1KgStr = escapeHTML((ur.price1Kg || "0").toString()); let currentPrice = parseFloat(p1KgStr.replace(',', '.')) || 0; let prior=Number(history[ur.pName]);let oldP=Number.isFinite(prior)&&prior>=0?prior:currentPrice||0;
                let badgeStr = ""; if (stokSifirMi) { badgeStr = `TÜKENDİ`; } else if (currentPrice < oldP) { badgeStr = `<span style="text-decoration: line-through; opacity: 0.6; font-size: 11px; margin-right: 5px; font-weight: 600;">${oldP.toString().replace('.',',')} ₺</span><span style="color: var(--success); font-weight: 900; font-size: 14px; text-shadow: 0 0 10px rgba(52, 199, 89, 0.4);">${p1KgStr} ₺</span>`; } else { badgeStr = `${p1KgStr} ₺`; }

                let kartOpaklik = stokSifirMi ? "opacity: 0.5; filter: grayscale(1);" : ""; let isPopular = ur.pName ? populerUrunlerListesi.includes(ur.pName) : false; let popularBadgeHTML = (isPopular && !stokSifirMi) ? `<div class="popular-badge">POPÜLER</div>` : "";

                const fotoUrl = FotoUrunUrl(ur.pName);
                const fotoIcerik = fotoUrl
                    ? `<div class="product-photo-area"><img src="${escapeHTML(fotoUrl)}" alt="${escapeHTML(ur.pName)}" loading="lazy" decoding="async" data-bkm-error="a73"><div class="product-icon-wrapper"><div class="product-icon">${icon}</div></div></div>`
                    : `<div class="product-icon-wrapper"><div class="product-icon">${icon}</div></div>`;
                gridContainer.innerHTML += `<div class="product-card ripple-element" style="${kartOpaklik} animation-delay: ${Math.min(i,10) * 0.04}s;" data-bkm-click="product" data-product-index="${orjinalIndex}" data-soldout="${stokSifirMi?1:0}">${popularBadgeHTML}${fotoIcerik}<div class="product-name">${escapeHTML(ur.pName)}</div>${ur.isMenu?'<span style="font-size:11px;color:var(--success)">MENÜ</span>':''}${ur.description?`<p style="margin:6px 0;font-size:12px;line-height:1.45;color:var(--text-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHTML(ur.description)}</p>`:''}<div class="product-price-badge">${badgeStr}</div></div>`;
            } catch(e) {}
        });
    }

    function UnityFiyatiniHesapla(p,amount){return bkmPrice(p,amount);}
    function AramayiTemizle() {
        const alan = document.getElementById('search-input');
        if(!alan) return;
        alan.value = '';
        UrunAra();
        alan.focus();
    }
    function AramaButonunuGuncelle() {
        const alan = document.getElementById('search-input');
        const sil = document.getElementById('search-clear');
        if(sil && alan) sil.hidden = !alan.value.trim();
    }
    function KategoriButonlariniGuncelle() {
        document.querySelectorAll('#kategori-sekmeleri button.tab-btn').forEach(b => b.setAttribute('aria-pressed', b.classList.contains('active') ? 'true':'false'));
    }
    function UrunAra() {
        const alan = document.getElementById('search-input');
        if (!alan) return;
        AramaButonunuGuncelle();
        const a = alan.value.toLocaleLowerCase('tr-TR').trim();
        if (a.length > 0) {
            document.querySelectorAll('#kategori-sekmeleri button.tab-btn').forEach(b => b.classList.remove('active'));
            KategoriButonlariniGuncelle();
            document.getElementById('tab-Arama').style.display = 'flex';
            EkranaUrunleriCiz(tumUrunler.filter(u => u.pName && u.pName.toLocaleLowerCase('tr-TR').includes(a)));
        } else {
            document.getElementById('tab-Arama').style.display = 'none';
            KategoriSec(aktifKategori);
        }
    }
    function KategoriSec(kategoriAdi, btnObj) {
        HapticTitresim();
        aktifKategori = kategoriAdi;
        document.querySelectorAll('#kategori-sekmeleri button.tab-btn').forEach(b => b.classList.remove('active'));
        if (btnObj) btnObj.classList.add('active');
        else { const el = document.getElementById('tab-' + kategoriAdi.replace(/\s+/g,'')); if(el) el.classList.add('active'); }
        KategoriButonlariniGuncelle();
        document.getElementById('tab-Arama').style.display = 'none';
        document.getElementById('search-input').value = '';
        AramaButonunuGuncelle();
        EkranaUrunleriCiz(tumUrunler.filter(u => GetKategoriAd(u) === aktifKategori));
        if (btnObj) document.getElementById('menu-section-title')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
// Bekmez catalog v11: fixed menu recipes, shared ingredient stock, explicit bread.
function bkmNum(v){const n=Number(String(v??'0').replace(',','.'));return Number.isFinite(n)&&n>=0?n:NaN;}
function bkmPrice(p,amount){const unit=bkmNum(p.price1Kg);if(!p.isKg)return Math.round(unit*amount*100)/100;const whole=Math.floor(amount+1e-6),rest=amount-whole,tail=rest>.7499?(p.price750g==null||p.price750g===''?Math.floor(unit*.75):bkmNum(p.price750g)):rest>.4999?(p.price500g==null||p.price500g===''?Math.floor(unit*.5):bkmNum(p.price500g)):Math.floor(unit*rest+1e-5);return Math.round((whole*unit+tail)*100)/100;}
function bkmFind(products,raw){return products.find(p=>p.pName.toLowerCase()===String(raw).toLowerCase());}
function bkmWrap(p){return !!p&&!p.isMenu&&!p.isKg&&p.categoryIndex===0&&(p.breadMode? p.breadMode===2:/(dürüm|durum|döner|doner|kebap|kebab)/iu.test(p.pName));}
function bkmAdd(map,key,amount){map.set(key,(map.get(key)||0)+amount);}
function bkmLegacyBread(name,kg,amount,count=1){const s=String(name).toLocaleLowerCase('tr-TR');if(kg){if(s.includes('ekmeksiz'))return 0;const only=s.match(/sadece\s+([0-9]{1,3})\s+ekmek/),extra=s.match(/\+([0-9]{1,3})\s+ek/);return only?Number(only[1])*count:amount*4+(extra?Number(extra[1])*count:0);}if(!/(dürüm|durum|döner|doner|kebap|kebab)/u.test(s)||/ekmeksiz|lavaşsız/u.test(s))return 0;return amount*(/1[.,]5 (lavaş|ekmek)/u.test(s)?1.5:/3 (lavaş|ekmek)/u.test(s)?3:2);}
function bkmLineBread(p,name,amount,count=1){return p.isMenu?0:p.isKg?bkmLegacyBread(String(name).replace(p.pName,''),true,amount,count):bkmWrap(p)?bkmLegacyBread('dürüm '+String(name).replace(p.pName,''),false,amount,count):0;}
function bkmRecipe(products,p){if(!p?.isMenu)return '';return (p.menuItems||[]).map(c=>{const child=bkmFind(products,c.rawName);if(!child||child.isMenu)throw Error('INVALID_MENU_RECIPE');return c.rawName.length+':'+c.rawName+':'+Number(c.amount).toString()+':'+(bkmWrap(child)?2:0)+':'+(child.isKg?1:0);}).join('|');}
function bkmExpand(products,p,amount,map){if(!p)throw Error('INVALID_PRODUCT');if(!p.isMenu){bkmAdd(map,p.pName,amount);return;}if(!Array.isArray(p.menuItems)||p.menuItems.length<2)throw Error('INVALID_MENU_RECIPE');for(const c of p.menuItems){const child=bkmFind(products,c.rawName);if(!child||child.isMenu||!Number.isFinite(c.amount)||c.amount<=0)throw Error('INVALID_MENU_RECIPE');bkmAdd(map,child.pName,c.amount*amount);if(bkmWrap(child))bkmAdd(map,bkmFind(products,'Ekmek')?.pName||'Ekmek',c.amount*amount*2);}}
function bkmNeeds(products,lines){const map=new Map();for(const r of lines){if(!r.rawName||['INDIRIM_KUPON_SYS','CARK_ODULU_SYS'].includes(r.rawName))continue;const p=bkmFind(products,r.rawName);if(!p||!Number.isFinite(r.miktar)||r.miktar<=0)throw Error('INVALID_PRODUCT');bkmExpand(products,p,r.miktar,map);if(!String(r.tamIsim).startsWith('🎁 ÇARK HEDİYESİ:')){const b=bkmLineBread(p,r.tamIsim,r.miktar,Number(String(r.tamIsim).match(/^([0-9]+)x\s/)?.[1]||1));if(b)bkmAdd(map,bkmFind(products,'Ekmek')?.pName||'Ekmek',b);}}return map;}
function bkmAvailable(products,p,used=new Map()){if(!p)return 0;if(!p.isMenu)return Math.max(0,bkmNum(p.stock)-(used.get(p.pName)||0));const needs=new Map();try{bkmExpand(products,p,1,needs);}catch{return 0;}let n=1e6;for(const [raw,qty]of needs){const child=bkmFind(products,raw);if(!child||!(qty>0))return 0;n=Math.min(n,(bkmNum(child.stock)-(used.get(child.pName)||0))/qty);}return Math.max(0,Math.floor(n+1e-6));}
function bkmValidateCatalog(products){if(!Array.isArray(products)||products.length>500)throw Error('INVALID_MENU_RECIPE');const names=new Set();for(const p of products){if(!p||typeof p.pName!=='string'||!p.pName.trim()||p.pName.length>120||/[<>\u0000-\u001f]/u.test(p.pName)||names.has(p.pName.toLowerCase())||p.description!=null&&(typeof p.description!=='string'||p.description.length>1200)||p.breadMode!=null&&(!Number.isInteger(p.breadMode)||p.breadMode<0||p.breadMode>3)||p.isMenu!=null&&typeof p.isMenu!=='boolean')throw Error('INVALID_MENU_RECIPE');names.add(p.pName.toLowerCase());if(!p.isMenu)continue;if(p.isKg||p.categoryIndex!==0||!Array.isArray(p.menuItems)||p.menuItems.length<2||p.menuItems.length>20)throw Error('INVALID_MENU_RECIPE');const seen=new Set();for(const c of p.menuItems){const child=c&&bkmFind(products,c.rawName);if(!child||child===p||child.isMenu||seen.has(child.pName)||!Number.isFinite(c.amount)||c.amount<=0||c.amount>100||!child.isKg&&!Number.isInteger(c.amount)||Math.abs(c.amount*4-Math.round(c.amount*4))>1e-5)throw Error('INVALID_MENU_RECIPE');seen.add(child.pName);}}}

    function ExtractBreadTotal(name,kg,amount){return bkmLegacyBread(name,kg,amount,Number(name.match(/^([0-9]+)x\s/)?.[1]||1));}
    function MenuSatirlari(items){return items.map(item=>({rawName:SepetUrununuBul(item.rawName)?.pName||item.rawName,tamIsim:(item.quantity>1?item.quantity+'x ':'')+item.baseName,miktar:Number(item.baseStockAmount)*Number(item.quantity)}));}
    function MenuIhtiyaclari(items){return bkmNeeds(tumUrunler,MenuSatirlari(items));}
    function KalanUrunStogu(product){try{return bkmAvailable(tumUrunler,product,MenuIhtiyaclari(sepet));}catch{return 0;}}
    function SecimIsmi(amount,bread=baseKgBread+ekstraEkmekKg,wrap=seciliOzelEkmekTip){let name=seciliUrun.pName;if(seciliUrun.isKg)name+=' ('+(bread?'Sadece '+bread+' Ekmek':'Ekmeksiz')+')';else if(bkmWrap(seciliUrun)&&wrap!=='Normal')name+=' ('+wrap+')';return name;}
    function SecimStokHatasi(amount,bread=baseKgBread+ekstraEkmekKg,wrap=seciliOzelEkmekTip){if(!(amount>0))return '';return SepetStokHatasi([...sepet,{rawName:seciliUrun.pName,baseName:SecimIsmi(amount,bread,wrap),baseStockAmount:amount,quantity:1,menuRecipe:bkmRecipe(tumUrunler,seciliUrun)}]);}
    function PopupStokButonlari(){if(!seciliUrun)return;const add=document.getElementById("popup-add-btn");if(add)add.disabled=seciliMiktar<=0||!!SecimStokHatasi(seciliMiktar);const plus=document.querySelector('#ekmek-sayac')?.parentElement?.querySelector('button:last-child');if(plus)plus.disabled=!!SecimStokHatasi(Math.max(.25,seciliMiktar),baseKgBread+ekstraEkmekKg+1);for(const [id,tip]of [['ekmek-1.5','1.5 Lavaş'],['ekmek-normal','Normal'],['ekmek-3','3 Lavaş']]){const button=document.getElementById(id);if(button)button.disabled=!!SecimStokHatasi(Math.max(1,seciliMiktar),0,tip);}}
    function SunucuSepetiHatasi(items) {
        if(!Array.isArray(items)||items.length<1||items.length>50) return 'Sipariş 1–50 farklı sepet satırı içermeli.';
        for(const item of items) {
            if(!item||typeof item.rawName!=='string'||!item.rawName.trim()||item.rawName.length>200||typeof item.tamIsim!=='string'||!item.tamIsim.trim()||item.tamIsim.length>200) return 'Sepetteki ürün bilgisi geçersiz veya fazla uzun.';
            if(!Number.isFinite(item.miktar)||item.miktar<=0||item.miktar>1000) return 'Bir sepet satırındaki miktar en fazla 1000 olabilir.';
            const prefix=item.tamIsim.match(/^([0-9]+)x\s/);
            const count=item.quantity ?? (prefix?Number(prefix[1]):1);
            if(!Number.isInteger(count)||count<1||count>1000||(prefix&&Number(prefix[1])!==count)) return 'Sepetteki porsiyon sayısı geçersiz.';
        }
        return '';
    }
    function UrunStogu(urun){return urun?bkmAvailable(tumUrunler,urun):0;}
    function SepetUrununuBul(rawName) {
        return tumUrunler.find(u => u.pName === rawName || escapeHTML(u.pName || '') === rawName);
    }
    function EkmekUrununuBul() {
        const name=ekmekUrunAdi.trim().toLocaleLowerCase('tr-TR');
        return tumUrunler.find(u => String(u.pName || '').trim().toLocaleLowerCase('tr-TR') === name);
    }
    function GuncelEkmekIhtiyaci(items){try{return MenuIhtiyaclari(items).get(EkmekUrununuBul()?.pName)||0;}catch{return Infinity;}}
    function SepetStokHatasi(items){try{for(const item of items)if(!Number.isFinite(Number(item.baseStockAmount))||Number(item.baseStockAmount)<=0||!Number.isInteger(item.quantity)||item.quantity<1)return 'Sepette geçersiz miktar var.';for(const item of items){const p=SepetUrununuBul(item.rawName);if(p?.isMenu&&item.menuRecipe!==undefined&&item.menuRecipe!==bkmRecipe(tumUrunler,p))return "Menü içeriği değişti. Lütfen menüyü sepetten çıkarıp yeniden seçin.";}const totals=MenuIhtiyaclari(items);for(const [raw,qty]of totals){const p=bkmFind(tumUrunler,raw);if(!p||qty>bkmNum(p.stock)+.000001)return raw+' stoğu yetersiz. Menü içeriği ve sepetteki diğer ürünler birlikte hesaplandı.';}return '';}catch{return 'Menü içeriği değişmiş veya ürün kaldırılmış. Lütfen sepeti yenileyin.';}}
    function StokUyarisi(message) { OzelUyariGoster('Stok Yetersiz',escapeHTML(message),'⚠️'); }
    function SepettekiUrunMiktari(product) {
        return sepet.reduce((total,item)=>total+(SepetUrununuBul(item.rawName)===product ? Number(item.baseStockAmount)*Number(item.quantity) : 0),0);
    }
    function PopupEkmekVarsayilaniniAyarla(){if(!seciliUrun?.isKg)return;baseKgBread=0;ekstraEkmekKg=0;seciliEkstraIstekler=seciliEkstraIstekler.filter(x=>x!=='Ekmeksiz');seciliEkstraIstekler.push('Ekmeksiz');}
    function PopupEkmekGostergesiniYenile() {
        const count=document.getElementById('ekmek-sayac');
        if(count) count.innerText=Math.max(0,baseKgBread+ekstraEkmekKg);
        const button=document.getElementById('btn-ekmeksiz');
        if(button) button.classList.toggle('active',seciliEkstraIstekler.includes('Ekmeksiz'));
    }

    async function PopupIciMiktarDegistir(yon) {
        if(!seciliUrun || ![1,-1].includes(yon)) return;
        const current=SepetUrununuBul(seciliUrun.pName);
        const amount=Number((seciliMiktar+yon*(seciliUrun.isKg?0.25:1)).toFixed(2));
        if(amount<0) return;
        if(amount>KalanUrunStogu(current)+0.000001) { StokUyarisi('Bu ürünün stok sınırına ulaştınız.'); return; }
        const selectionError=SecimStokHatasi(amount);if(selectionError){StokUyarisi(selectionError);return;}
        HapticTitresim();seciliMiktar=amount;seciliFiyat=UnityFiyatiniHesapla(seciliUrun,amount);
        if(seciliUrun.isKg) {
            const noBread=seciliEkstraIstekler.includes('Ekmeksiz');
            const extra=ekstraEkmekKg;
            PopupEkmekVarsayilaniniAyarla();
            if(noBread) { ekstraEkmekKg=0;if(!seciliEkstraIstekler.includes('Ekmeksiz'))seciliEkstraIstekler.push('Ekmeksiz'); }
            else if(extra>0) ekstraEkmekKg=Math.min(extra,Math.max(0,Math.floor(UrunStogu(EkmekUrununuBul())-GuncelEkmekIhtiyaci(sepet))-baseKgBread));
            PopupEkmekGostergesiniYenile();
        }
        await PopupUIYenile(true);
    }

    async function UrunPopupAc(index) { 
        if(isPopupOpening) return; isPopupOpening = true; setTimeout(() => { isPopupOpening = false; }, 600);
        try {
            HapticTitresim(); seciliUrun = tumUrunler[index]; seciliMiktar = 0; seciliFiyat = 0; seciliEkstraIstekler = []; seciliOzelEkmekTip = "Normal"; baseKgBread = 0; ekstraEkmekKg = 0; oncekiPopupFiyat = 0; oncekiPopupMiktar = 0; seciliUrunStok = 999; 
            seciliUrunStok=UrunStogu(seciliUrun);
            const remaining=KalanUrunStogu(seciliUrun);
            if(remaining<(seciliUrun.isKg?0.25:1)) { StokUyarisi('Bu ürün için sepete eklenebilecek stok kalmadı.');isPopupOpening=false;return; }
            const popupFoto = document.getElementById("product-popup-photo");
            if(popupFoto) { const fotoAdres = FotoUrunUrl(seciliUrun.pName); popupFoto.style.display = fotoAdres ? 'block' : 'none'; popupFoto.onerror = () => { popupFoto.style.display = 'none'; }; if(fotoAdres) popupFoto.src = fotoAdres; else popupFoto.removeAttribute('src'); }
            document.getElementById("popup-title").innerText=seciliUrun.pName||"Ürün";const description=document.getElementById("popup-product-description");description.textContent=(seciliUrun.description||"")+(seciliUrun.isMenu?"\nMenü içeriği: "+(seciliUrun.menuItems||[]).map(c=>c.amount+" × "+c.rawName).join(" + "):""); seciliMiktar = seciliUrun.isKg ? Math.min(1,Math.floor(remaining*4)/4) : 1; seciliFiyat = UnityFiyatiniHesapla(seciliUrun, seciliMiktar); PopupEkmekVarsayilaniniAyarla();if(bkmWrap(seciliUrun)&&SecimStokHatasi(seciliMiktar,0,"Normal")&&!SecimStokHatasi(seciliMiktar,0,"1.5 Lavaş"))seciliOzelEkmekTip="1.5 Lavaş"; await PopupUIYenile(false); 

            let pL = (seciliUrun.pName || "").toString().toLocaleLowerCase('tr-TR'); let cA = document.getElementById("popup-custom-area"); let iS = bkmWrap(seciliUrun); let hI = ""; 
            if (GetKategoriAd(seciliUrun) === "İçecek" || GetKategoriAd(seciliUrun) === "Ekstra") { cA.style.display = "none"; } else if (seciliUrun.isKg) { hI = `<div class="p-sec-title">İstemediğiniz Malzemeler:</div><div class="p-btn-row"><button class="ingredient-btn" data-bkm-click="a74">Zerzavatsız</button><button class="ingredient-btn" id="btn-ekmeksiz" data-bkm-click="a75">Ekmeksiz</button><button class="ingredient-btn" data-bkm-click="a76">Domatessiz</button><button class="ingredient-btn" data-bkm-click="a77">Maydanozsuz</button><button class="ingredient-btn" data-bkm-click="a78">Sadece pişecek</button></div><div class="p-counter-box"><span class="p-c-label">Toplam Ekmek Adedi:</span><div class="p-c-ctrls"><button class="p-c-btn" data-bkm-click="a79">-</button><span id="ekmek-sayac" class="p-c-val">${baseKgBread+ekstraEkmekKg}</span><button class="p-c-btn" data-bkm-click="a80">+</button></div></div>`; cA.style.display = "block"; } else if (iS) { hI = `<div class="p-sec-title">Ekmek Seçimi:</div><div class="p-btn-row"><button class="bread-btn" id="ekmek-1.5" data-bkm-click="a81">1.5 Lavaş</button><button class="bread-btn active" id="ekmek-normal" data-bkm-click="a82">Normal (2)</button><button class="bread-btn" id="ekmek-3" data-bkm-click="a83">3 Lavaş</button></div><div class="p-sec-title">İstemediğiniz Malzemeler:</div><div class="p-btn-row" style="margin-bottom:0;"><button class="ingredient-btn" data-bkm-click="a84">Soğansız</button><button class="ingredient-btn" data-bkm-click="a76">Domatessiz</button><button class="ingredient-btn" data-bkm-click="a77">Maydanozsuz</button><button class="ingredient-btn" data-bkm-click="a78">Sadece pişecek</button><button class="ingredient-btn" data-bkm-click="a85">Acısı İçinde</button></div>`; cA.style.display = "block"; } else if(seciliUrun.isMenu){hI=`<div class="p-sec-title">Yemek için tercihleriniz:</div><div class="p-btn-row"><button class="ingredient-btn" data-bkm-click="a86">Soğansız</button><button class="ingredient-btn" data-bkm-click="a87">Maydanozsuz</button><button class="ingredient-btn" data-bkm-click="a88">Domatessiz</button><button class="ingredient-btn" data-bkm-click="a89">Sadece pişecek</button></div><p style="color:var(--text-muted);font-size:12px">İçecek ve menü miktarları sabittir. Dürüm/döner içeriğinde adet başına 2 lavaş kullanılır.</p>`;cA.style.display='block';} else { cA.style.display = "none"; } 
            cA.innerHTML = hI;PopupStokButonlari();if(seciliOzelEkmekTip==='1.5 Lavaş'){document.getElementById('ekmek-normal')?.classList.remove('active');document.getElementById('ekmek-1.5')?.classList.add('active');} PopupEkmekGostergesiniYenile(); let pu = document.getElementById("product-popup"); pu.style.display = "flex"; setTimeout(() => { pu.classList.add("active"); }, 10); 
        } catch (e) { isPopupOpening = false; }
    }

    async function EkstraIstekToggle(btn,istek){HapticTitresim();if(istek==='Ekmeksiz'){ekstraEkmekKg=0;seciliEkstraIstekler=seciliEkstraIstekler.filter(x=>x!=='Ekmeksiz');seciliEkstraIstekler.push('Ekmeksiz');PopupEkmekGostergesiniYenile();await PopupUIYenile(true);return;}const selected=seciliEkstraIstekler.includes(istek);if(istek==='Sadece Pişecek'&&!selected)seciliEkstraIstekler=seciliEkstraIstekler.filter(x=>x==='Ekmeksiz');else if(istek!=='Sadece Pişecek')seciliEkstraIstekler=seciliEkstraIstekler.filter(x=>x!=='Sadece Pişecek');if(selected)seciliEkstraIstekler=seciliEkstraIstekler.filter(x=>x!==istek);else seciliEkstraIstekler.push(istek);document.querySelectorAll('#popup-custom-area .ingredient-btn').forEach(button=>button.classList.toggle('active',seciliEkstraIstekler.includes(button.textContent.trim())));await PopupUIYenile(true);}
    async function EkmekSayaciDegistir(artis) {
        if(!seciliUrun?.isKg || ![1,-1].includes(artis)) return;
        const chosen=baseKgBread+ekstraEkmekKg+artis;
        if(chosen<0) return;
        if(SecimStokHatasi(Math.max(.25,seciliMiktar),chosen)) { StokUyarisi('Artırabileceğiniz ekmek stoğu kalmadı.'); return; }
        HapticTitresim();ekstraEkmekKg=chosen-baseKgBread;
        seciliEkstraIstekler=seciliEkstraIstekler.filter(x=>x!=='Ekmeksiz');
        if(!chosen) seciliEkstraIstekler.push('Ekmeksiz');
        PopupEkmekGostergesiniYenile();await PopupUIYenile(true);
    }
    async function OzelEkmekSec(tip,btn) {
        const perUnit=tip==='3 Lavaş'?3:tip==='1.5 Lavaş'?1.5:2;
        if(perUnit*seciliMiktar+GuncelEkmekIhtiyaci(sepet)>UrunStogu(EkmekUrununuBul())+0.000001) {StokUyarisi('Seçilen lavaş için stok yetersiz.');return;}
        const error=SecimStokHatasi(seciliMiktar,0,tip);if(error){StokUyarisi(error);return;}
        HapticTitresim();seciliOzelEkmekTip=tip;document.querySelectorAll('.bread-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');await PopupUIYenile(true);
    }
    async function PopupSifirla() {
        if(!seciliUrun) return;
        const remaining=KalanUrunStogu(SepetUrununuBul(seciliUrun.pName));
        seciliMiktar=seciliUrun.isKg?Math.max(0,Math.min(1,Math.floor(remaining*4)/4)):Math.max(0,Math.min(1,Math.floor(remaining)));
        HapticTitresim();seciliFiyat=UnityFiyatiniHesapla(seciliUrun,seciliMiktar);
        document.querySelectorAll('.ingredient-btn.active').forEach(b=>b.classList.remove('active'));
        seciliEkstraIstekler=[];seciliOzelEkmekTip='Normal';ekstraEkmekKg=0;
        document.querySelectorAll('.bread-btn').forEach(b=>b.classList.remove('active'));
        document.getElementById('ekmek-normal')?.classList.add('active');
        PopupEkmekVarsayilaniniAyarla();PopupEkmekGostergesiniYenile();await PopupUIYenile(true);
    }
    function PopupKapat() { let pu = document.getElementById("product-popup"); pu.classList.remove("active"); setTimeout(() => { pu.style.display = "none"; isPopupOpening = false; }, 500); }

    async function PopupUIYenile(animasyonlu) { 
        try {
            let ekstraEkmekUcreti = 0; if (seciliUrun) { let pL = (seciliUrun.pName || "").toString().toLocaleLowerCase('tr-TR'); let iS = bkmWrap(seciliUrun); if (seciliUrun.isKg && ekstraEkmekKg > 0 && !seciliEkstraIstekler.includes('Ekmeksiz')) { ekstraEkmekUcreti = ekstraEkmekKg * ekmekBirimFiyati; } else if (!seciliUrun.isKg && iS && seciliOzelEkmekTip === "3 Lavaş") { ekstraEkmekUcreti = seciliMiktar * ekmekBirimFiyati; } } 
            let gosterilenFiyat = seciliFiyat + ekstraEkmekUcreti; let history = {}; try { let h = await SecureOku('bg_phist'); if (h) history = JSON.parse(h); } catch(e) {}
            let pS = (seciliUrun.price1Kg || "0").toString(); let currentBase = parseFloat(pS.replace(',', '.')) || 0; let oldBase = history[seciliUrun.pName] || currentBase; let isDiscount = (currentBase < oldBase); let displayHTML = ""; 
            if (isDiscount) { let oldTotal = UnityFiyatiniHesapla({price1Kg: oldBase.toString(), isKg: seciliUrun.isKg}, seciliMiktar) + ekstraEkmekUcreti; displayHTML = `<span style="text-decoration: line-through; font-size: 14px; color: #a1a1aa; margin-right:8px;">${oldTotal.toFixed(2)} TL</span><span style="color: var(--success);">${gosterilenFiyat.toFixed(2)} TL</span>`; } else { displayHTML = `${gosterilenFiyat.toFixed(2)} TL`; } 
            PopupStokButonlari();document.getElementById("popup-amount").innerText = seciliMiktar > 0 ? (seciliUrun.isKg ? seciliMiktar.toFixed(2)+" KG" : seciliMiktar.toFixed(0)+" Adet") : "0"; document.getElementById("popup-price").innerHTML = displayHTML; document.getElementById("popup-amount").style.color = seciliMiktar > 0 ? "var(--text-main)" : "var(--text-muted)"; 
            oncekiPopupMiktar = seciliMiktar; oncekiPopupFiyat = gosterilenFiyat; 
        } catch (e) {}
    }

    function ShowFloatingPlusOne() { let fxContainer = document.getElementById("fx-container"); if (!fxContainer) { fxContainer = document.createElement("div"); fxContainer.id = "fx-container"; fxContainer.style.position = "fixed"; fxContainer.style.top = "0"; fxContainer.style.left = "0"; fxContainer.style.width = "100%"; fxContainer.style.height = "100%"; fxContainer.style.pointerEvents = "none"; fxContainer.style.zIndex = "2147483647"; document.body.appendChild(fxContainer); } let pop = document.createElement("div"); pop.innerHTML = `<span style="font-size:18px;">✨</span> Sepete Eklendi`; pop.style.position = "absolute"; pop.style.top = "40%"; pop.style.left = "50%"; pop.style.transform = "translate(-50%, -50%)"; pop.style.background = "linear-gradient(135deg, #10B981 0%, #059669 100%)"; pop.style.color = "white"; pop.style.padding = "12px 20px"; pop.style.borderRadius = "100px"; pop.style.fontWeight = "900"; pop.style.fontSize = "14px"; pop.style.display = "flex"; pop.style.alignItems = "center"; pop.style.gap = "10px"; pop.style.boxShadow = "0 10px 25px rgba(16, 185, 129, 0.5)"; pop.style.animation = "floatUpFade 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"; fxContainer.appendChild(pop); setTimeout(() => pop.remove(), 1200); }
    function TriggerCartBounce() { let cart = document.getElementById("floating-cart"); if(cart) { cart.classList.remove("bounce"); void cart.offsetWidth; cart.classList.add("bounce"); } }

    async function PopupSepeteEkle() { 
        if(window.isAddingToCart) return; if(seciliMiktar <= 0) return; window.isAddingToCart=true; 
        if(await SecureOku("bg_active_order_id")) { OzelUyariGoster("İşlem Engellendi", "Mevcut siparişiniz teslim edilmeden veya iptal edilmeden yeni bir sipariş oluşturamazsınız.", "⏳"); window.isAddingToCart=false; PopupKapat(); return; }

        window.isAddingToCart = true; HapticTitresim(); SessizIzinIste(); 
        let tamIsim = ""; let eklenecekAdet = 1; let gercekStokMiktari = seciliMiktar; let ekstraEkmekUcreti = 0; let pL = (seciliUrun.pName || "").toString().toLocaleLowerCase('tr-TR'); let isSpecial = bkmWrap(seciliUrun); 
        if (seciliUrun.isKg) { tamIsim = Number(seciliMiktar.toFixed(2)) + " KG " + seciliUrun.pName; eklenecekAdet = 1; if (ekstraEkmekKg > 0 && !seciliEkstraIstekler.includes('Ekmeksiz')) { ekstraEkmekUcreti = ekstraEkmekKg * ekmekBirimFiyati; } } else { tamIsim = seciliUrun.pName; eklenecekAdet = seciliMiktar; gercekStokMiktari = 1; if (isSpecial && seciliOzelEkmekTip === "3 Lavaş") ekstraEkmekUcreti = ekmekBirimFiyati; } 
        let modlar = [...seciliEkstraIstekler]; if (seciliUrun.isKg) { let tB = baseKgBread + ekstraEkmekKg; if (tB === 0) { if (!modlar.includes("Ekmeksiz")) modlar.push("Ekmeksiz"); } else if (ekstraEkmekKg > 0) { modlar.push("Sadece " + tB + " Ekmek"); } else if (ekstraEkmekKg < 0) { modlar.push("Sadece " + tB + " Ekmek"); } } else { if (isSpecial && seciliOzelEkmekTip !== "Normal") modlar.push(seciliOzelEkmekTip); } 
        modlar = [...new Set(modlar)]; if (modlar.length > 0) { tamIsim += " (" + modlar.join(", ") + ")"; } 
        let sB = seciliUrun.isKg ? seciliFiyat : (seciliFiyat / seciliMiktar); let gB = sB + ekstraEkmekUcreti; let mevcutUrun = sepet.find(u => u.baseName === escapeHTML(tamIsim) && u.basePrice === gB); 
        
        if(isNaN(gB) || gB < 0 || eklenecekAdet <= 0 || gercekStokMiktari <= 0) { window.isAddingToCart = false; return; }

        const candidate={baseName:escapeHTML(tamIsim),basePrice:gB,baseStockAmount:gercekStokMiktari,quantity:eklenecekAdet,rawName:escapeHTML(seciliUrun.pName),menuRecipe:bkmRecipe(tumUrunler,seciliUrun)};
        const stokHatasi=SepetStokHatasi([...sepet,candidate]);
        if(stokHatasi) { StokUyarisi(stokHatasi);window.isAddingToCart=false;return; }
        if(mevcutUrun) { mevcutUrun.quantity += eklenecekAdet; } else { sepet.push({ baseName: escapeHTML(tamIsim), basePrice: gB, baseStockAmount: gercekStokMiktari, quantity: eklenecekAdet, rawName: escapeHTML(seciliUrun.pName), menuRecipe:bkmRecipe(tumUrunler,seciliUrun) }); } 
        ShowFloatingPlusOne(); TriggerCartBounce();
        if(Date.now()-pushCartNoticeAt>15000) {
            pushCartNoticeAt=Date.now();
            BildirimGonder('Sepetine eklendi 🛍️','Ürün sepetine eklendi. Siparişini Sepetim bölümünden tamamlayabilirsin.',true,'sepet');
        } 
        
        setTimeout(async () => { PopupKapat(); await HesaplaVeGuncelle(); window.isAddingToCart = false; }, 300); 
    }

    async function SepetMiktarDegistir(index, artisMiktari) { 
        HapticTitresim(); let sepetUrunu = sepet[index]; 
        if(!sepetUrunu || ![1,-1].includes(artisMiktari)) return;
        if(artisMiktari>0) {
            const candidate=sepet.map((item,i)=>({...item,quantity:item.quantity+(i===index?artisMiktari:0)}));
            const error=SepetStokHatasi(candidate);
            if(error) {StokUyarisi(error);return;}
        }
        sepet[index].quantity += artisMiktari; 
        if(sepet[index].quantity <= 0) { sepet.splice(index, 1); SepetEkraniniCiz(); } else { document.getElementById("cart-qty-" + index).innerText = escapeHTML(sepet[index].quantity); document.getElementById("cart-price-" + index).innerText = (sepet[index].basePrice * sepet[index].quantity).toFixed(2) + " TL"; let nE = document.getElementById("cart-name-" + index); if(nE) nE.innerHTML = (sepet[index].quantity > 1 ? `<span style="color:var(--primary);">${escapeHTML(sepet[index].quantity)}x</span> ` : "") + escapeHTML(sepetUrunu.baseName); } 
        await HesaplaVeGuncelle(); 
    }

    function SepetEkraniniCiz() {
        let listContainer = document.getElementById("cart-items-list");
        if(sepet.length === 0 && !aktifKullanilanCarkOdulu) {
            listContainer.innerHTML = `<div class="empty-state-box">${emptyCartSVG}<p>Sepetiniz boş.</p></div>`;
            document.getElementById("alt-panel").style.display = "none";
            document.getElementById("cart-note-section").style.display = "none";
            document.getElementById("aktif-hediye-uyari").style.display = aktifKullanilanCarkOdulu ? "block" : "none";
            if(!aktifKullanilanCarkOdulu) document.getElementById("floating-cart").style.display = "none";
            return;
        }
        document.getElementById("aktif-hediye-uyari").style.display = aktifKullanilanCarkOdulu ? "block" : "none";
        
        listContainer.innerHTML = "";
        sepet.forEach((urun, index) => {
            let n = (urun.quantity > 1 ? `<span style="color:var(--primary);">${escapeHTML(urun.quantity)}x</span> ` : "") + escapeHTML(urun.baseName);
            let p = (urun.basePrice * urun.quantity).toFixed(2) + " TL";
            listContainer.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-details">
                    <div class="cart-item-name" id="cart-name-${index}">${n}</div>
                    <div class="cart-item-price" id="cart-price-${index}">${p}</div>
                </div>
                <div class="cart-controls">
                    <button class="cart-btn ripple-element" data-bkm-click="cart-minus" data-cart-index="${index}">-</button>
                    <span class="cart-amount" id="cart-qty-${index}">${escapeHTML(urun.quantity)}</span>
                    <button class="cart-btn ripple-element" data-bkm-click="cart-plus" data-cart-index="${index}">+</button>
                </div>
            </div>`;
        });
        document.getElementById("alt-panel").style.display = "block";
        document.getElementById("cart-note-section").style.display = "block";
    }

    // ==========================================
    // 6. KUPONLAR & ÇARK SİSTEMİ (Güvenli JWT)
    // ==========================================
    async function KuponlariCek() {
        try {
            let mR = await fetch(`${FIREBASE_URL}/KuponlarPublic.json?t=${Date.now()}`);
            let data = await mR.json(); let list = document.getElementById("firsatlar-list");
            if (!data || data.error) { list.innerHTML = `<div class="empty-state-box">${emptyCouponSVG}<p>Aktif kampanya bulunmuyor 😔</p></div>`; return; }
            let yeniVeri = JSON.stringify(data); if (sonKuponVerisi === yeniVeri) return; sonKuponVerisi = yeniVeri;
            list.innerHTML = ""; let hasKupon = false;
            for (let key in data) {
                let k = data[key];
                if (k.discountAmount && k.isAppCoupon === true) {
                    hasKupon = true;
                    list.innerHTML += `<div class="coupon-card ripple-element"><div class="c-left"><span class="c-discount">${escapeHTML(k.discountAmount)}₺</span><span class="c-type">İNDİRİM</span></div><div class="c-right"><div class="c-title">${k.targetProduct && k.targetProduct !== "Herşey" ? escapeHTML(k.targetProduct) + " için geçerli!" : "Tüm menüde geçerli!"}</div><div class="c-code">${escapeHTML(key)}</div><div class="c-limit">Alt Limit: ${escapeHTML(k.bottomLimit)} TL</div><div class="c-btn" data-bkm-click="coupon" data-coupon="${escapeHTML(key)}">Kodu Kopyala</div></div></div>`;
                }
            }
            if (!hasKupon) list.innerHTML = `<div class="empty-state-box">${emptyCouponSVG}<p>Aktif kampanya bulunmuyor 😔</p></div>`;
        } catch (e) { document.getElementById("firsatlar-list").innerHTML = `<div class="empty-state-box">${emptyCouponSVG}<p>Kuponlar yüklenemedi.</p></div>`; }
    }

    function KuponKopyala(kod) { HapticTitresim(); navigator.clipboard.writeText(kod).then(() => { OzelUyariGoster("Kopyalandı", `Kupon kodu (${kod}) kopyalandı! Sepetinizde kullanabilirsiniz.`, "📋"); }); }
    
    async function KuponSorgula() { 
        let iE = document.getElementById("coupon-code"); let gK = escapeHTML(iE.value.trim().toUpperCase()); let b = document.getElementById("coupon-apply-btn"); 
        if(gK === "") { OzelUyariGoster("Boş Kod", "Lütfen bir kod giriniz.", "⚠"); return; } 

        let tries = parseInt(await SecureOku("cpn_try") || "0");
        let blockTime = parseInt(await SecureOku("cpn_blk") || "0");
        // Süresi dolan bekleme yeniden başlamamalı; bu sayaç yalnız arayüz içindir.
        if(blockTime > 0 && Date.now() >= blockTime) { tries = 0; await SecureSil("cpn_try"); await SecureSil("cpn_blk"); }
        if(Date.now() < blockTime) { OzelUyariGoster("Engellendi", "Çok fazla hatalı deneme yaptınız. 15 Dakika sonra tekrar deneyin.", "🚫"); return; }
        if(tries >= 5) { await SecureKaydet("cpn_blk", Date.now() + (15*60000)); OzelUyariGoster("Kilitlendi", "5 Hatalı deneme sebebiyle kupon sistemi 15 dk kilitlendi.", "🔒"); return; }

        b.innerHTML = `<div class="spinner-small" style="margin-right:0;"></div>`; b.disabled = true; 
        
        try {
            let res = await fetch(`${FIREBASE_URL}/KuponlarPublic/${gK}.json?t=${Date.now()}`);
            let d = await res.json();
            b.disabled = false; b.innerText = "Uygula";
            
            if(d && !d.error && d.discountAmount > 0 && d.remainingUses > 0) { 
                await SecureSil("cpn_try"); await SecureSil("cpn_blk");
                if (d.isAppCoupon !== true) { KuponuIptalEt(true); OzelUyariGoster("Sadece Mağazada", "Bu kupon sadece restoran içi siparişlerde geçerlidir.", "🚫"); return; }
                let aU = (d.targetProduct && d.targetProduct !== "") ? d.targetProduct : "Herşey"; let uS = false; let hM = ""; 
                
                if(aU === "Herşey") { uS = true; } else { let aV = sepet.some(u => u.rawName.toLocaleLowerCase('tr-TR') === aU.toLocaleLowerCase('tr-TR')); let bV = sepet.some(u => u.rawName.toLocaleLowerCase('tr-TR') !== aU.toLocaleLowerCase('tr-TR')); if (!aV) { hM = `'${escapeHTML(aU)}' sepette yok.`; } else if (bV) { hM = `Sadece '${escapeHTML(aU)}' almalısınız.`; } else { uS = true; } } 
                
                if(!uS) { await KuponuIptalEt(true); OzelUyariGoster("Şart Sağlanmadı", hM, "🛍"); return; } 
                if (hamToplamFiyat < d.bottomLimit) { await KuponuIptalEt(true); OzelUyariGoster("Tutar Yetersiz", `Alt limit ${d.bottomLimit} TL.`, "🛒"); return; } 
                
                HapticTitresim(); aktifKuponKodu = gK; aktifKuponIndirimTutari = d.discountAmount; aktifKuponAltLimit = d.bottomLimit; aktifKuponHedefUrun = aU; 
                
                OzelUyariGoster("Onaylandı", `${d.discountAmount} TL indirim uygulandı!`, "✅"); 
                BildirimGonder("Kupon Aktif! 🎟", `${d.discountAmount} TL değerindeki indiriminiz sepete başarıyla yansıtıldı.`);
                
                await HesaplaVeGuncelle(); KuponArayuzunuGuncelle(); 
            } else { 
                await SecureKaydet("cpn_try", tries + 1);
                if(tries + 1 >= 5) await SecureKaydet("cpn_blk", Date.now() + 15*60000);
                await KuponuIptalEt(true); OzelUyariGoster("Geçersiz", tries + 1 >= 5 ? "5 hatalı deneme yaptınız. 15 dakika sonra tekrar deneyebilirsiniz." : `Hatalı, tükenmiş veya süresi dolmuş kod. (${4 - tries} hakkınız kaldı)`, "❌");
            } 
        } catch(e) { b.disabled = false; b.innerText = "Uygula"; OzelUyariGoster("Hata", "Bağlantı hatası.", "📡"); }
    }

    async function KuponuIptalEt(sM = false) { if(!sM) HapticTitresim(); aktifKuponKodu = ""; aktifKuponIndirimTutari = 0; aktifKuponAltLimit = 0; aktifKuponHedefUrun = "Herşey"; let iE = document.getElementById("coupon-code"); if(iE) iE.value = ""; KuponArayuzunuGuncelle(); if(!sM) await HesaplaVeGuncelle(); }
    function KuponArayuzunuGuncelle() { let b = document.getElementById("coupon-apply-btn"); let m = document.getElementById("coupon-message"); let iE = document.getElementById("coupon-code"); if(aktifKuponIndirimTutari > 0) { b.style.background = "var(--danger)"; b.style.color = "white"; b.innerText = "İptal Et"; b.onclick = () => KuponuIptalEt(false); if(iE) { iE.disabled = true; iE.style.opacity = "0.6"; } m.innerHTML = `<span style="color: var(--success);">✓ ${aktifKuponIndirimTutari} TL İndirim!</span>`; } else { b.style.background = "rgba(255,255,255,0.05)"; b.style.color = "var(--text-main)"; b.innerText = "Uygula"; b.onclick = KuponSorgula; if(iE) { iE.disabled = false; iE.style.opacity = "1"; } m.innerHTML = ""; } }

    function WheelIsPass(value){return String(value||'').trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu,'').toLocaleLowerCase('tr-TR')==='pas';}
    function WheelPaintRewards(rewards=CARK_ODULLERI){
        for(let index=0;index<5;index++){
            const label=document.getElementById('cark-ui-'+(index+1));if(!label)continue;
            label.textContent=typeof rewards?.[index]==='string'?rewards[index]:'Pas';
            // Conic gradients start at 12 o'clock; CSS rotate starts at 3 o'clock.
            label.parentElement.style.transform=`rotate(${index*72+36-90}deg)`;
        }
    }
    // Set to your existing Worker's HTTPS /wheel/spin endpoint after deployment.
    const WHEEL_API_URL = 'https://bekmez-kasa.arifbekmez63.workers.dev/wheel/spin';
    let wheelRequest = null, wheelSessionEpoch = 0;
    function WheelSession() {
        const user = firebase.auth().currentUser;
        if (!user || !user.emailVerified || isBannedUser || user.uid === 'jO9Jmp2cgXfGUfMVbv5fdlCPgV52') return null;
        return user;
    }
    function WheelStillCurrent(user, epoch) {
        return epoch === wheelSessionEpoch && WheelSession()?.uid === user.uid;
    }
    function WheelResetSession() {
        PhoneVerificationStop();
        ++wheelSessionEpoch; aktifKullanilanCarkOdulu = null;
        const popup = document.getElementById('cark-popup');
        if(popup)CarkPopupKapat();
        WheelResultClose();
        for (const id of ['aktif-cark-hediye-kutusu', 'aktif-hediye-uyari']) {
            const el = document.getElementById(id); if (el) el.style.display = 'none';
        }
    }
    async function WheelIdentity(showNotice = true) {
        const user = WheelSession();
        if (!user) {
            if (showNotice) { SayfaGoster('profil'); OzelUyariGoster('Hesabınıza giriş yapın', 'Çark ve ödüller yalnızca e-postası doğrulanmış müşteri hesaplarına açıktır.', '🔒'); }
            return null;
        }
        const epoch = wheelSessionEpoch;
        let tel;
        try { tel = SiparisTelefonunuStandartlastir(user.displayName || await SecureOku('bg_t')); }
        catch (_) { if (showNotice) OzelUyariGoster('Telefon doğrulaması gerekli', 'Hesabınızdaki telefon doğrulamasını tamamlayın.', '🔒'); return null; }
        return WheelStillCurrent(user, epoch) ? {user, tel, epoch} : null;
    }
    async function WheelReward(identity) {
        const snapshot = await WheelWait(firebase.database().ref('CarkKullanimlari/' + identity.tel).once('value'));
        if (!WheelStillCurrent(identity.user, identity.epoch)) return null;
        const record = snapshot.val();
        if(!record||typeof record.odul!=='string'||record.odul.length>100||!Number.isFinite(record.bitis)||record.bitis<=WheelNow()||record.uid&&record.uid!==identity.user.uid)return null;
        if(record.spinId){const ledger=await WheelWait(firebase.database().ref('MusteriIslemleri/'+identity.tel+'/usedRewards').once('value'));const used=ledger.val()?.[record.spinId];if(used?.orderId){let state='';try{const status=await WheelWait(firebase.database().ref('KasaSiparisDurumlari/'+used.orderId).once('value'));state=status.val()?.status||'';}catch(_){}if(!['cancelled','rejected'].includes(state))record.usedOrderId=used.orderId;}}
        return WheelStillCurrent(identity.user,identity.epoch)?record:null;
    }
    async function CarkDurumunuKontrolEt() {
        const banner=document.getElementById('cark-banner'), desc=document.getElementById('cark-banner-desc'), btn=document.getElementById('cark-banner-btn');
        const box=document.getElementById('aktif-cark-hediye-kutusu');
        if (banner) banner.style.display='flex'; if (box) box.style.display='none';
        const identity=await WheelIdentity(false);
        if (!identity) { aktifKullanilanCarkOdulu=null; if(desc)desc.textContent='Hesabınıza giriş yaparak fırsatları keşfedin.';if(btn)btn.textContent='Giriş yap';return; }
        if(desc)desc.textContent='Doğrulanmış hesabınıza özel haftalık fırsat.';if(btn)btn.textContent='Çarkı aç';
        try {
            const reward=await WheelReward(identity);if(!reward||!WheelStillCurrent(identity.user,identity.epoch))return;
            if(reward.usedOrderId){if(desc)desc.textContent='Çark ödülünüz siparişinizde kullanıldı. Yeni hakkınız süre dolunca açılır.';if(btn)btn.textContent='Bilgi';return;}
            if(WheelIsPass(reward.odul)){if(desc)desc.textContent='Bu haftanın hakkı kullanıldı. Yeni hakkınız süre dolunca açılır.';if(btn)btn.textContent='Bilgi';return;}if(banner)banner.style.display='none';
            if(box)box.style.display='block';document.getElementById('kazanilan-odul-yazi').textContent=reward.odul;
            const days=Math.max(1,Math.ceil((reward.bitis-WheelNow())/86400000));document.getElementById('kazanilan-sure-yazi').textContent=days+' gün içinde kullanabilirsiniz.';
        } catch (_) { if(desc)desc.textContent='Fırsat bilgisi alınamadı. Bağlantınızı kontrol edin.'; }
    }
    async function CarkPopupAc() {
        const identity=await WheelIdentity();if(!identity)return;
        try{if(await WheelWait(BanKontrolu(identity.tel))||!WheelStillCurrent(identity.user,identity.epoch))return;}catch(_){OzelUyariGoster('Kontrol tamamlanamadı','Bağlantınızı kontrol ederek tekrar deneyin.','ℹ');return;}
        let reward;try{reward=await WheelReward(identity);}catch(_){OzelUyariGoster('Bilgi alınamadı','Çark hakkınız doğrulanamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.','📡');return;}
        if(!WheelStillCurrent(identity.user,identity.epoch))return;
        if(reward){WheelShowResult(reward,identity,true);void CarkDurumunuKontrolEt();return;}
        if(!WHEEL_API_URL){OzelUyariGoster('Çark şu anda kullanılamıyor','Kampanya kısa süre içinde yeniden kullanıma açılacak. Diğer fırsatları keşfedebilirsiniz.','ℹ');return;}
        if(wheelRequest){OzelUyariGoster('Çark işlemi sürüyor','Sonuç kaydedildiğinde Fırsatlar ekranından görebilirsiniz.','ℹ');return;}
        WheelPaintRewards(CARK_ODULLERI);
        document.getElementById('cark-element').style.transform='rotate(0deg)';document.getElementById('cark-element').style.transition='none';
        const button=document.getElementById('cark-cevir-btn');button.style.display='block';button.disabled=!!wheelRequest;button.textContent='Şansımı Dene!';
        document.getElementById('cark-durum-metni').textContent='Haftada bir hak. Sonuç hesabınıza güvenli şekilde kaydedilir.';
        PremiumDialogOpen('cark-popup');
    }
    function CarkPopupKapat(){PremiumDialogClose('cark-popup');}
    function WheelResultClose(){PremiumDialogClose('cark-result-popup');}
    function WheelShowResult(record,identity,existing=false){
        // Sonuç istemcide üretilmez. Yalnız doğrulanmış sunucu yanıtı/kayıt gösterilir.
        if(!identity||!WheelStillCurrent(identity.user,identity.epoch)||!record||typeof record.odul!=='string'||!record.odul.trim()||record.odul.length>100||!Number.isFinite(record.bitis)||record.bitis<=WheelNow()||(record.uid&&record.uid!==identity.user.uid))return false;
        const pass=WheelIsPass(record.odul),used=!!record.usedOrderId;
        const date=new Date(record.bitis).toLocaleString('tr-TR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'});
        document.getElementById('cark-result-icon').innerHTML=PremiumIcon(pass?'info':'check');
        document.getElementById('cark-result-title').textContent=used?'Ödülünüz siparişte kullanıldı':pass?'Bu tur Pas geldi':existing?'Kayıtlı ödülünüz':'Tebrikler, kazandınız!';
        document.getElementById('cark-result-prize').textContent=record.odul;
        document.getElementById('cark-result-description').textContent=used?'Bu ödül başka bir siparişte tekrar kullanılamaz. Yeni çark hakkınız süre dolunca açılır.':pass?'Bu kez ödül çıkmadı. Yeni hakkınız açıldığında tekrar şansınızı deneyebilirsiniz.':'Ödülünüz hesabınıza kaydedildi. Menüden seçtiğiniz bir ürünle birlikte siparişinize ücretsiz ekleyebilirsiniz.';
        document.getElementById('cark-result-expiry').textContent=(pass?'Yeni çark hakkınız: ':'Son kullanım: ')+date+' (Türkiye saati)';
        const primary=document.getElementById('cark-result-primary');primary.textContent=pass||used?'Tamam':'Sepete ekle';primary.disabled=false;
        primary.onclick=async()=>{if(primary.disabled)return;primary.disabled=true;WheelResultClose();if(!pass&&!used&&WheelStillCurrent(identity.user,identity.epoch))await CarkHediyesiniKullan();};
        document.getElementById('cark-result-later').style.display=pass||used?'none':'block';
        CarkPopupKapat();PremiumDialogOpen('cark-result-popup');return true;
    }
    function WheelError(code, message) { const error=new Error(message); error.code=code; return error; }
    function WheelWait(promise, milliseconds=12000) {
        let timer;
        return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(WheelError('REQUEST_TIMEOUT','Yanıt gecikti. Fırsatlar ekranından ödülünüzü kontrol edip tekrar deneyin.')),milliseconds);})]).finally(()=>clearTimeout(timer));
    }
    function WheelDiagnostic(stage, status=0, code='') {
        // Yalnız işlem aşaması ve hata kodu; token, e-posta, telefon veya anahtar tutulmaz.
        window.BekmezCarkTeshis={stage,status,code:/^[A-Z_]{2,80}$/.test(code)?code:'',at:new Date().toISOString()};
    }
    function WheelServiceMessage(code) {
        return ({
            WEEKLY_LIMIT:'Bu haftanın çark hakkı kullanıldı. Yeni hakkınız süre dolunca açılır.',
            ACCOUNT_BLOCKED:'Hesabınızın kampanya erişimi kapatılmış.',
            PHONE_NOT_VERIFIED:'Hesabınızdaki telefon doğrulamasını tamamlayın.',
            RATE_LIMITED:'Çok sık işlem yapıldı. Bir süre sonra tekrar deneyin.',
            LOGIN_REQUIRED:'Oturumunuz doğrulanamadı. Hesabınıza yeniden giriş yapın.',
            CUSTOMER_REQUIRED:'Çark için e-postası doğrulanmış müşteri hesabınızla giriş yapın.',
            APP_CHECK_REQUIRED:'Uygulama güvenlik kontrolü tamamlanamadı. Sayfayı yenileyip tekrar deneyin.',
            APP_CHECK_INVALID:'Uygulama güvenlik kontrolü doğrulanamadı. Sayfayı yenileyip tekrar deneyin.',
            WHEEL_NOT_CONFIGURED:'Çark kampanyası şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
            ORIGIN_REJECTED:'Bu sayfadan kampanyaya erişilemiyor. İşletmenin resmi sipariş sayfasını açın.',
            REWARDS_NOT_CONFIGURED:'Çark ödülleri şu anda hazırlanıyor. Diğer fırsatları keşfedebilirsiniz.',
            RATE_LIMIT_NOT_CONFIGURED:'Kampanya hizmeti şu anda kullanılamıyor. Lütfen daha sonra deneyin.',
            REWARD_CONFLICT:'Çark kaydınız kontrol ediliyor. Fırsatlar ekranından mevcut ödülünüzü kontrol edin.',
            DATABASE_UNAVAILABLE:'Kampanya bilgisine şu anda ulaşılamıyor. Fırsatlar ekranından ödülünüzü kontrol edin.'
        })[code]||'Çark sonucu alınamadı. Fırsatlar ekranından ödülünüzü kontrol ederek tekrar deneyin.';
    }
    async function WheelSend(identity, requestId) {
        const url=new URL(WHEEL_API_URL);
        if(url.protocol!=='https:'||url.hostname!=='bekmez-kasa.arifbekmez63.workers.dev'||url.pathname!=='/wheel/spin'||url.search||url.hash||url.username||url.password)throw WheelError('SERVICE_URL_INVALID','Çark kampanyası şu anda kullanılamıyor.');
        for(let attempt=0;attempt<2;attempt++) {
            WheelDiagnostic('security');
            let tokens;
            try { tokens=await WheelWait(Promise.all([identity.user.getIdToken(attempt===1),appCheck.getToken(attempt===1)])); }
            catch(error) { if(error.code==='REQUEST_TIMEOUT')throw error;throw WheelError('SECURITY_TOKEN_UNAVAILABLE','Güvenlik kontrolü tamamlanamadı. Bağlantınızı kontrol edip sayfayı yenileyin.'); }
            if(!WheelStillCurrent(identity.user,identity.epoch))return null;
            const [idToken,check]=tokens;
            if(typeof idToken!=='string'||!idToken||typeof check?.token!=='string'||!check.token)throw WheelError('SECURITY_TOKEN_UNAVAILABLE','Güvenlik kontrolü tamamlanamadı. Sayfayı yenileyin.');
            const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
            let response,data;
            try {
                WheelDiagnostic('request');
                response=await fetch(url.href,{method:'POST',headers:await BekmezSecurity.headers('/wheel/spin',{telefon:identity.tel,requestId},identity.user,idToken,check.token),body:JSON.stringify({telefon:identity.tel,requestId}),signal:controller.signal,cache:'no-store'});
                const body=await response.text();
                if(body.length>8192)throw WheelError('SERVICE_RESPONSE_INVALID','Kampanya yanıtı doğrulanamadı. Daha sonra tekrar deneyin.');
                try {data=JSON.parse(body);}catch(_){throw WheelError('SERVICE_RESPONSE_INVALID','Kampanyaya şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.');}
                if(!data||typeof data!=='object'||Array.isArray(data))throw WheelError('SERVICE_RESPONSE_INVALID','Kampanya yanıtı doğrulanamadı. Daha sonra tekrar deneyin.');
            } catch(error) {
                if(typeof error.code==='string'&&/^[A-Z_]{2,80}$/.test(error.code))throw error;
                if(error.name==='AbortError')throw WheelError('REQUEST_TIMEOUT','Yanıt gecikti. Fırsatlar ekranından ödülünüzü kontrol edin.');
                throw WheelError('SERVICE_CONNECTION_FAILED','Kampanyaya bağlantı kurulamadı. Bağlantınızı kontrol edin; sorun sürerse işletmeyle iletişime geçin.');
            } finally { clearTimeout(timer); }
            if(!WheelStillCurrent(identity.user,identity.epoch))return null;
            WheelDiagnostic('response',response.status,data?.code||'');
            // Yalnız ödül yazılmadan dönen kimlik/güvenlik hatalarında tek yenileme.
            if(attempt===0&&response.status===401&&['LOGIN_REQUIRED','APP_CHECK_INVALID','APP_CHECK_REQUIRED'].includes(data?.code))continue;
            if(!response.ok)throw WheelError(data?.code||'SERVICE_FAILED',WheelServiceMessage(data?.code));
            return data;
        }
        return null;
    }
    async function CarkCevir() {
        if(wheelRequest)return;
        const operation={};wheelRequest=operation;const button=document.getElementById('cark-cevir-btn');if(button)button.disabled=true;
        try {
            const identity=await WheelIdentity();if(!identity)return;
            if(await WheelWait(BanKontrolu(identity.tel))||!WheelStillCurrent(identity.user,identity.epoch))return;
            document.getElementById('cark-durum-metni').textContent='Hakkınız doğrulanıyor…';
            const data=await WheelSend(identity,crypto.randomUUID());
            if(!data||!WheelStillCurrent(identity.user,identity.epoch))return;
            if(!data.ok||data.uid!==identity.user.uid||typeof data.odul!=='string'||!data.odul.trim()||data.odul.length>100||!Number.isInteger(data.index)||data.index<0||data.index>4||!Number.isFinite(data.bitis)||data.bitis<=WheelNow())throw WheelError('RESULT_INVALID','Çark sonucu doğrulanamadı. Fırsatlar ekranından ödülünüzü kontrol edin.');
            operation.completed=true;
            if(button)button.textContent='Çark dönüyor…';
            const labels=Array.from({length:5},(_,index)=>CARK_ODULLERI[index]||'Pas');
            labels[data.index]=data.odul;WheelPaintRewards(labels);
            const wheel=document.getElementById('cark-element');wheel.style.transition='transform 4s cubic-bezier(0.1,0.7,0.1,1)';wheel.style.transform=`rotate(${2160+360-data.index*72-36}deg)`;
            document.getElementById('cark-durum-metni').textContent='Sonuç hesabınıza kaydedildi. Çark dönüyor…';
            await new Promise(resolve=>setTimeout(resolve,4100));if(!WheelStillCurrent(identity.user,identity.epoch))return;
            document.getElementById('cark-durum-metni').textContent=WheelIsPass(data.odul)?'Sonuç: Pas. Bu kez ödül çıkmadı; yeni hakkınız süre dolunca açılır.':'Kazandınız: '+data.odul;
            // Kullanıcı X/Escape ile kapattıysa sonuç penceresini zorla yeniden açma.
            if(document.getElementById('cark-popup').style.display==='flex')WheelShowResult(data,identity,!!data.existing);
            WheelDiagnostic('complete');await CarkDurumunuKontrolEt();
        }catch(error){
            WheelDiagnostic('failed',window.BekmezCarkTeshis?.status||0,error.code||'CLIENT_ERROR');
            if(WheelSession())OzelUyariGoster('Çark işlemi tamamlanamadı',error.message,'ℹ');
        }finally{if(wheelRequest===operation){wheelRequest=null;if(button){button.disabled=!!operation.completed;if(operation.completed)button.textContent='Sonuç kaydedildi';}}}
    }
    function WheelNow(){return typeof GetServerTimeFast==='function'?GetServerTimeFast():Date.now();}
    async function WheelRestoreGift(saved){
        if(!saved)return false;
        const identity=await WheelIdentity(false);if(!identity)return false;
        try{
            const reward=await WheelReward(identity);
            if(!reward||reward.odul!==saved||WheelIsPass(reward.odul)||!WheelStillCurrent(identity.user,identity.epoch))return false;
            aktifKullanilanCarkOdulu=reward.odul;
            document.getElementById('aktif-hediye-uyari').style.display='block';
            document.getElementById('sepet-hediye-yazi').textContent=reward.odul+' — siparişe ücretsiz eklenir';return true;
        }catch(_){return false;}
    }

    async function CarkHediyesiniKullan() {
        const identity=await WheelIdentity();if(!identity)return;
        try {const reward=await WheelReward(identity);if(!reward||reward.usedOrderId||WheelIsPass(reward.odul)){OzelUyariGoster('Ödül bulunamadı','Kullanılabilir ödülünüz bulunmuyor.','ℹ');return;}
            if(!WheelStillCurrent(identity.user,identity.epoch))return;aktifKullanilanCarkOdulu=reward.odul;
            document.getElementById('aktif-cark-hediye-kutusu').style.display='none';document.getElementById('aktif-hediye-uyari').style.display='block';document.getElementById('sepet-hediye-yazi').textContent=reward.odul+' — siparişe ücretsiz eklenir';
            SayfaGoster('sepet');await HesaplaVeGuncelle();
        }catch(_){OzelUyariGoster('Ödül doğrulanamadı','Bağlantınızı kontrol ederek tekrar deneyin.','📡');}
    }
    async function CarkHediyesiIptal(){aktifKullanilanCarkOdulu=null;document.getElementById('aktif-hediye-uyari').style.display='none';await CarkDurumunuKontrolEt();await HesaplaVeGuncelle();}


    // ==========================================
    // 7. SIFIR GÜVEN (ZERO-TRUST) SİPARİŞ VE HESAPLAMA
    // ==========================================
    async function HesaplaVeGuncelle() {
        hamToplamFiyat = 0;
        sepet.forEach(u => { hamToplamFiyat += (u.basePrice * u.quantity); });

        if (aktifKuponIndirimTutari > 0) {
            if (hamToplamFiyat >= aktifKuponAltLimit && sepet.length>0 && (aktifKuponHedefUrun==='Herşey'||sepet.every(u=>u.rawName===aktifKuponHedefUrun))) {
                sonOdenecekFiyat = hamToplamFiyat - aktifKuponIndirimTutari;
                if (sonOdenecekFiyat < 0) sonOdenecekFiyat = 0;
                document.getElementById("eski-fiyat-ustu-cizik").innerText = hamToplamFiyat.toFixed(2) + " TL";
                document.getElementById("eski-fiyat-ustu-cizik").style.display = "block";
            } else {
                sonOdenecekFiyat = hamToplamFiyat;
                document.getElementById("eski-fiyat-ustu-cizik").style.display = "none";
                KuponuIptalEt(true);
            }
        } else {
            sonOdenecekFiyat = hamToplamFiyat;
            document.getElementById("eski-fiyat-ustu-cizik").style.display = "none";
        }

        document.getElementById("sepet-tutar").innerText = sonOdenecekFiyat.toFixed(2) + " TL";
        document.getElementById("floating-total").innerText = sonOdenecekFiyat.toFixed(2) + " TL";
        let bdg = document.getElementById("nav-sepet-badge");
        if(sepet.length > 0 || aktifKullanilanCarkOdulu) { bdg.innerText = sepet.length + (aktifKullanilanCarkOdulu ? 1 : 0); bdg.classList.add("show"); document.getElementById("floating-cart").style.display = "flex"; document.getElementById("alt-panel").style.display = "block"; document.getElementById("cart-note-section").style.display = "block"; } 
        else { bdg.classList.remove("show"); document.getElementById("floating-cart").style.display = "none"; document.getElementById("alt-panel").style.display = "none"; document.getElementById("cart-note-section").style.display = "none"; }
        
        await SecureKaydet("bg_saved_cart", JSON.stringify(sepet));
        PushSepetDurumuYansit();
    }

    async function CheckoutPopupAc() { 
        if(!WheelSession()){SayfaGoster('profil');OzelUyariGoster('Hesabınıza giriş yapın','Sipariş için e-postası ve telefonu doğrulanmış müşteri hesabınızla giriş yapın.','🔒');return;}
        if(!SepetteUcretliUrunVar()) {OzelUyariGoster('Sepetinize ürün ekleyin','Çark hediyesi ve kupon, menüden eklediğiniz bir ürünle birlikte kullanılabilir.','🛒');return;} 
        if(await SecureOku("bg_active_order_id")) { OzelUyariGoster("Siparişiniz Yolda", "Mevcut siparişiniz teslim edilmeden veya iptal edilmeden yeni bir sipariş oluşturamazsınız.", "🛵"); return; }
        
        let chkIsim = document.getElementById("chk-isim"); let chkAdres = document.getElementById("chk-adres");
        if(chkIsim && !chkIsim.value) chkIsim.value = await SecureOku("bg_i") || "";
        if(chkAdres && !chkAdres.value) chkAdres.value = await SecureOku("bg_a") || "";

        HapticTitresim(); let p = document.getElementById("checkout-popup"); p.style.display = "flex"; setTimeout(() => { p.classList.add("active"); }, 10); TogglePayButton(); 
    }

    function TogglePayButton() {
        let chk = document.getElementById("legal-checkbox"); let btn = document.getElementById("final-submit-btn"); let btnText = document.getElementById("final-btn-text");
        if (chk && chk.checked && !isProcessingOrder && SepetteUcretliUrunVar()) { btn.disabled = false; btn.style.opacity = "1"; btnText.innerHTML = `${sonOdenecekFiyat.toFixed(2)} TL Öde`; } 
        else { btn.disabled = true; btn.style.opacity = "0.5"; btnText.innerHTML = `Sözleşmeyi Onaylayın`; }
    }

    // İzin reddi, zaman aşımı ve GPS cihazı hatalarını ayrı mesajlarla göster.
    function GpsPozisyonAl(options) {
        return new Promise((resolve,reject) => {
            if (!('geolocation' in navigator)) return reject(new Error('Bu cihazda GPS desteklenmiyor.'));
            if (!window.isSecureContext) return reject(new Error('Konum için güvenli HTTPS bağlantısı gerekli.'));
            navigator.geolocation.getCurrentPosition(resolve,reject,options);
        });
    }
    function TeslimatKonumuUygun(p) {
        const c=p?.coords;
        if (!c || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude) || Math.abs(c.latitude)>90 || Math.abs(c.longitude)>180 || !Number.isFinite(c.accuracy) || c.accuracy<0) return false;
        // Büyük belirsizlik bile tamamıyla hizmet alanında kalıyorsa kullanılabilir.
        return GetDistanceKm(DUKKAN_ENLEM, DUKKAN_BOYLAM, c.latitude, c.longitude) + c.accuracy/1000 <= MAKS_MESAFE_KM;
    }
    async function GpsTeslimatKonumuAl() {
        let best = null, lastError = null;
        for (const high of [true, false]) {
            try {
                const p = await GpsPozisyonAl({enableHighAccuracy:high, timeout:high?15000:12000, maximumAge:0});
                if (!best || p.coords.accuracy < best.coords.accuracy) best=p;
                if (TeslimatKonumuUygun(p)) return p;
            } catch(e) {
                lastError=e;
                if (e?.code===1) throw new Error('Konum izni reddedildi. Windows konum ayarını ve tarayıcıdaki bu sitenin Konum iznini açın.');
                if (!e?.code) throw e;
            }
        }
        if (best) return best;
        throw new Error(lastError?.code===3 ? 'Konum sağlayıcısı zaman aşımına uğradı. Windows ve tarayıcı konum izinlerini kontrol edin; telefonunuzdan da deneyebilirsiniz.' : 'Cihaz konum sağlayamadı. Konum düğmesinin açık olması tek başına yeterli değildir; Windows ve bu sitenin konum izinlerini kontrol edin.');
    }

    function SiparisTelefonunuStandartlastir(value) {
        let n=String(value || '').replace(/[^0-9]/g, '');
        if (n.length === 12 && n.startsWith('90')) n=n.slice(2);
        if (n.length === 10) n='0'+n;
        if (!/^0[0-9]{10}$/.test(n)) throw new Error('Telefon numarası geçersiz. Profildeki doğrulanmış telefonunuzu kontrol edin.');
        return n;
    }
    async function PaketSiparisiGonder() {
        if (isBannedUser || !firebase.auth().currentUser) return;
        if(isProcessingOrder)return; if(!SepetteUcretliUrunVar()){OzelUyariGoster('Sepetinize ürün ekleyin','Sipariş için menüden en az bir ürün seçin. Çark hediyesi tek başına gönderilemez.','🛒');return;}
        if(!document.getElementById("legal-checkbox").checked) { OzelUyariGoster("Sözleşme Onayı", "Lütfen sipariş koşullarını inceleyip kabul kutusunu işaretleyin.", "📝"); return; }
        
        let telControl;
        try { telControl=SiparisTelefonunuStandartlastir(document.getElementById("chk-telefon").value); }
        catch(e) { OzelUyariGoster('Telefon Kontrolü', escapeHTML(e.message), '📞'); return; }
        if(!telControl || telControl.length < 10) { OzelUyariGoster("Telefon Doğrulaması", "Sipariş verebilmek için profil sekmesinden telefonunuzu doğrulamanız zorunludur.", "🛡"); return; }

        let lastOrderStr = await SecureOku("last_ord_t");
        if(lastOrderStr && Date.now() - parseInt(lastOrderStr) < 180000) { OzelUyariGoster("Spam Koruması", "Yeni sipariş vermek için lütfen 3 dakika bekleyin.", "⏳"); return; }

        HapticTitresim();
        let is = document.getElementById("chk-isim").value.trim().substring(0,120); let tl = telControl; let ad = document.getElementById("chk-adres").value.trim().substring(0,2500); let secilenOdeme = document.getElementById("odeme-turu-secim").value;

        let hV = false; 
        if(is.length < 3) { document.getElementById("chk-isim").classList.add("input-error"); setTimeout(() => document.getElementById("chk-isim").classList.remove("input-error"), 500); hV = true; } 
        if(tl.length < 10) { document.getElementById("chk-telefon").classList.add("input-error"); setTimeout(() => document.getElementById("chk-telefon").classList.remove("input-error"), 500); hV = true; } 
        if(ad.length < 10) { document.getElementById("chk-adres").classList.add("input-error"); setTimeout(() => document.getElementById("chk-adres").classList.remove("input-error"), 500); hV = true; }
        if(hV) { OzelUyariGoster("Eksik", "Ad, telefon veya adres hatalı.", "⚠"); return; }

        let btn = document.getElementById("final-submit-btn"); btn.disabled = true; btn.classList.add("loading"); 
        let btnText = document.getElementById("final-btn-text"); btnText.innerHTML = `<div class="spinner-small"></div> Konum Bulunuyor...📍`;
        isProcessingOrder = true;

        try {
            const p = await GpsTeslimatKonumuAl();
            const lat = Number(p.coords.latitude), lng = Number(p.coords.longitude);
            const accuracy = Number(p.coords.accuracy);
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180) throw new Error('Konum bilgisi geçersiz. Lütfen tekrar deneyin.');
            if(!Number.isFinite(accuracy) || accuracy < 0) throw new Error('Konum hassasiyet bilgisi geçersiz.');
            const ms = GetDistanceKm(DUKKAN_ENLEM, DUKKAN_BOYLAM, lat, lng);
            // Ölçüm belirsizliği dahil hizmet alanını kontrol et.
            if (ms - accuracy/1000 > MAKS_MESAFE_KM) {
                const do2 = document.getElementById('distance-alert-overlay');
                do2.style.display='flex'; setTimeout(() => do2.classList.add('active'), 10);
                return;
            }
            if (!TeslimatKonumuUygun(p)) throw new Error('Konumunuz teslimat sınırını doğrulayacak kadar kesin değil (yaklaşık ±' + Math.round(accuracy) + ' metre). Wi-Fi ve konum izinlerini kontrol edin veya telefonunuzdan deneyin.');
            await DevamEtPaketGonder(is, tl, ad, secilenOdeme, sepet, lat, lng, accuracy);
        } catch(e) {
            OzelUyariGoster('Konum Kontrolü 📍', escapeHTML(e?.message||'Konum alınamadı; lütfen tekrar deneyin.'), '📍');
        } finally {
            if(isProcessingOrder) { // Başarılı sipariş, DevamEtPaketGonder içinde zaten temizlenir.
                isProcessingOrder=false;
                btn.disabled=false; btn.classList.remove('loading');
                btnText.textContent=`${sonOdenecekFiyat.toFixed(2)} TL Öde`;
            }
        }
    }

    function SepetteUcretliUrunVar(){return sepet.some(u=>u&&Number.isFinite(u.basePrice)&&u.basePrice>0&&Number.isFinite(u.baseStockAmount)&&u.baseStockAmount>0&&Number.isInteger(u.quantity)&&u.quantity>0&&u.rawName!=='CARK_ODULU_SYS'&&u.rawName!=='INDIRIM_KUPON_SYS');}
    function OrderServiceMessage(code){return ({
      DEVICE_PROOF_REQUIRED:'Cihaz doğrulaması gerekli. Sayfayı güncelleyin.',DEVICE_PROOF_REJECTED:'Cihaz imzası doğrulanamadı. İşlem yapılmadı.',CUSTOMER_DEVICE_UNKNOWN:'Cihaz kaydı kapalı veya bulunamadı. Yeniden giriş yapın.',DEVICE_PROOF_USED:'İstek zaten kontrol edildi. Aynı siparişin sonucunu kontrol edip yeniden deneyin.',CUSTOMER_DEVICE_LIMIT:'Hesabınızın cihaz sınırı doldu. İşletmeyle iletişime geçin.',BOT_TOKEN_REQUIRED:'Güvenlik doğrulaması gerekli.',BOT_CHECK_FAILED:'Bot kontrolü doğrulanamadı. Tekrar deneyin.',BOT_NOT_CONFIGURED:'Bot kontrolü işletme tarafından yapılandırılmalı.',BOT_PROVIDER_UNAVAILABLE:'Güvenlik hizmeti geçici olarak yanıt vermiyor.',TLS13_REQUIRED:'Bu bağlantı TLS 1.3 gerektiriyor. Güncel tarayıcı kullanın.',PHONE_AMBIGUOUS:'Hesabınız birden fazla telefon kaydıyla eşleşti. İşletmeden kayıtların birleştirilmesini isteyin.',
      PHONE_UNAVAILABLE:'Bu numaranın doğrulaması tamamlanamadı. Kendi telefon numaranızı kullanın veya işletmeyle iletişime geçin.',
      VERIFICATION_LIMIT:'Bugünkü telefon doğrulama sınırına ulaştınız. İşletmeyle iletişime geçin.',INVALID_PROFILE:'Ad veya adres alanı sınırı aşıldı.',RECENT_LOGIN_REQUIRED:'Güvenlik için çıkış yapıp yeniden giriş yapın.',CUSTOMER_NOT_CONFIGURED:'Hesap hizmeti henüz yapılandırılmamış. İşletmeyle iletişime geçin.',

      PAID_PRODUCT_REQUIRED:'Siparişe menüden en az bir ürün ekleyin. Kupon ve çark hediyesi tek başına gönderilemez.',
      INVALID_MENU_RECIPE:'Menü içeriği değişmiş veya eksik. Menüyü sepetten çıkarıp yeniden seçin.',MENU_UNAVAILABLE:'Güncel ürün listesi doğrulanamadı. Sayfayı yenileyerek tekrar deneyin.',
      INVALID_CART:'Sepette geçersiz bir ürün veya miktar var. Sepeti kontrol edin.',INVALID_PRODUCT:'Sepette menüyle eşleşmeyen bir ürün var.',INVALID_QUANTITY:'Ürün miktarı geçersiz.',
      OUT_OF_STOCK:'Seçtiğiniz ürünün stoğu azaldı. Sepeti güncelleyip tekrar deneyin.',BREAD_OUT_OF_STOCK:'Ekmek stoğu yetersiz. Ekmek sayısını azaltın veya ekmeksiz seçin.',
      ACTIVE_ORDER_EXISTS:'Devam eden bir siparişiniz var. Önce Siparişlerim ekranını kontrol edin.',SHOP_CLOSED:'İşletme şu anda sipariş kabul etmiyor.',
      COUPON_INVALID:'Kuponun kullanım hakkı, ürün koşulu veya alt limiti uygun değil. Kuponu kaldırıp tekrar deneyin.',PRICE_CHANGED:'Menü fiyatı değişti. Sepetinizdeki ürünleri güncel fiyatla tekrar ekleyin.',
      REWARD_INVALID:'Çark ödülünüz kullanılamıyor veya süresi dolmuş.',REWARD_ALREADY_USED:'Bu çark ödülü başka bir siparişte kullanılmış.',REWARD_OUT_OF_STOCK:'Çark hediyesinin stoğu bitti. Hediyeyi çıkarıp sipariş verebilirsiniz.',
      REWARD_NOT_CONFIGURED:'İşletme çark hediyesinin ürün eşleştirmesini henüz tamamlamamış. Hediyeyi çıkarıp sipariş verebilir veya işletmeye ulaşabilirsiniz.',
      ORDER_COOLDOWN:'Yeni sipariş için üç dakikalık bekleme süresi henüz dolmadı.',DAILY_ORDER_LIMIT:'Günlük sipariş sınırına ulaştınız. İşletmeyle iletişime geçin.',
      CANCELLATION_CLOSED:'İptal/düzenleme süresi doldu veya ödeme yöntemi bu işleme uygun değil. İşletmeyle iletişime geçin.',ORDER_ALREADY_ACCEPTED:'Sipariş kasa tarafından işleme alındı. Değişiklik için işletmeyle iletişime geçin.',
      LOCATION_REQUIRED:'Teslimat konumu doğrulanamadı.',OUTSIDE_DELIVERY_AREA:'Konumunuz teslimat bölgesinde doğrulanamadı.',
      INVALID_ORDER:'Sipariş bilgileri geçersiz veya zaman aşımına uğramış. Bilgilerinizi kontrol edip tekrar deneyin.',
      IDEMPOTENCY_CONFLICT:'Bekleyen gönderimle yeni sepet uyuşmuyor. Önce Siparişlerim ekranından sonucu kontrol edin.',
      BUSY_RETRY:'İşlem başka bir istekle çakıştı. Birkaç saniye sonra tekrar deneyin; aynı sipariş kontrol edilir.',
      DATABASE_UNAVAILABLE:'Sipariş bilgilerine şu anda ulaşılamıyor. Bağlantıyı kontrol ederek aynı siparişle yeniden deneyin.',REQUEST_TEMPORARILY_UNAVAILABLE:'İşlem gecikti. Yeniden denediğinizde aynı sipariş kontrol edilir.',REQUEST_TOO_LARGE:'Sepet bilgisi boyut sınırını aşıyor. Notu kısaltın veya ürün satırlarını azaltın.',PHONE_NOT_VERIFIED:'Telefon doğrulamanızı tamamlayın.',ACCOUNT_BLOCKED:'Hesabınızın sipariş erişimi kapatılmış.',LOGIN_REQUIRED:'Oturumunuz doğrulanamadı. Hesabınıza yeniden giriş yapın.',CUSTOMER_REQUIRED:'Doğrulanmış müşteri hesabınızla giriş yapın.',APP_CHECK_INVALID:'Uygulama güvenlik kontrolü tamamlanamadı. Sayfayı yenileyin.',APP_CHECK_REQUIRED:'Uygulama güvenlik kontrolü gerekli. Sayfayı yenileyin.',RATE_LIMITED:'Çok kısa sürede fazla işlem yapıldı. Bir süre bekleyip yeniden deneyin.'
    })[code]||'İşlem şu anda tamamlanamadı. Bir süre sonra aynı işlemle yeniden deneyin.';}
    async function CustomerService(path,payload){
      const user=WheelSession(),epoch=wheelSessionEpoch;if(!user)throw new Error('E-postası doğrulanmış müşteri hesabınızla giriş yapın.');
      for(let attempt=0;attempt<2;attempt++){
        const [token,check]=await WheelWait(Promise.all([user.getIdToken(attempt===1),appCheck.getToken(attempt===1)]));
        if(!WheelStillCurrent(user,epoch))throw new Error('Oturum değişti. İşlem durduruldu.');
        const control=new AbortController(),timer=setTimeout(()=>control.abort(),30000);
        let response,data;
        try{
          response=await fetch(new URL(path,WHEEL_API_URL).href,{method:'POST',headers:await BekmezSecurity.headers(path,payload,user,token,check.token),body:JSON.stringify(payload),signal:control.signal,cache:'no-store'});
          const text=await response.text();if(text.length>65536)throw new Error('Sunucu yanıtı geçersiz.');try{data=JSON.parse(text);}catch(_){throw new Error('Sipariş hizmetine şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.');}if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Sunucu yanıtı doğrulanamadı.');
        }finally{clearTimeout(timer);}
        if(!WheelStillCurrent(user,epoch))throw new Error('Oturum değişti. Siparişin sonucunu yeniden giriş yaparak kontrol edin.');
        if(attempt===0&&response.status===401&&['LOGIN_REQUIRED','APP_CHECK_INVALID','APP_CHECK_REQUIRED'].includes(data?.code))continue;
        if(!response.ok||!data?.ok){const e=new Error(OrderServiceMessage(data?.code));e.code=data?.code;e.status=response.status;throw e;}
        return data;
      }
      throw new Error('Oturum doğrulanamadı. Tekrar giriş yapın.');
    }
    async function DevamEtPaketGonder(isim,tel,adres,odemeTuru,temizSepet,lat=0,lng=0,accuracy=0){
      const user=WheelSession();if(!user||isBannedUser)return;
      const btn=document.getElementById('final-submit-btn'),label=document.getElementById('final-btn-text'),pendingKey='bg_pending_order_'+user.uid;
      label.textContent='Sipariş kontrol ediliyor…';let saved=false;
      try{
        const cart=temizSepet.map(u=>({rawName:u.rawName,tamIsim:(u.quantity>1?u.quantity+'x ':'')+u.baseName,miktar:u.baseStockAmount*u.quantity,quantity:u.quantity}));
        const error=SunucuSepetiHatasi(cart);if(error)throw new Error(error);
        let pending;try{pending=JSON.parse(await SecureOku(pendingKey));}catch(_){}
        if(!pending?.id||pending.data?.uid!==user.uid){
          pending={id:generateUUID(),uiCart:JSON.parse(JSON.stringify(temizSepet)),data:{uid:user.uid,telefon:tel,musteriAd:isim,adres,odemeTuru,siparisNotu:document.getElementById('siparis-notu').value.trim(),kuponKodu:aktifKuponKodu,carkOdulu:aktifKullanilanCarkOdulu,sepet:cart,gpsInfo:{latitude:lat,longitude:lng,accuracy},timestamp:Date.now(),durum:'KASA ONAYI BEKLENİYOR ⏳',expectedTotal:sonOdenecekFiyat}};
          await SecureKaydet(pendingKey,JSON.stringify(pending));
        }
        const reply=await CustomerService('/orders/create',{orderId:pending.id,telefon:pending.data.telefon,draft:pending.data});
        if(reply.orderId!==pending.id)throw new Error('Sipariş yanıtı eşleşmiyor. Siparişlerim ekranını kontrol edin.');
        saved=true;
        await SecureKaydet('bg_order_edit_'+pending.id,JSON.stringify({cart:pending.uiCart||[],note:pending.data.siparisNotu,coupon:pending.data.kuponKodu,reward:pending.data.carkOdulu}));
        await SecureKaydet('bg_active_order_id',pending.id);await SecureKaydet('bg_order_timestamp',ZamanMuhruKodla(reply.timestamp,pending.id));await SecureKaydet('last_ord_t',String(reply.timestamp));await SecureKaydet('bg_odeme_turu',pending.data.odemeTuru);await SecureSil(pendingKey);
        window.isOrderFinished=false;aktifKullanilanCarkOdulu=null;aktifKuponKodu='';aktifKuponIndirimTutari=0;aktifKuponAltLimit=0;aktifKuponHedefUrun='Herşey';sepet=[];
        document.getElementById('siparis-notu').value='';document.getElementById('aktif-hediye-uyari').style.display='none';document.getElementById('coupon-code').value='';KuponArayuzunuGuncelle();SepetEkraniniCiz();await HesaplaVeGuncelle();
        seciliEkstraIstekler=[];CheckoutKapat();BasariEkraniGoster();await SiparisDurumBildiriminiBaslat(pending.id);
      }catch(e){
        // Only definitive pre-commit validation failures permit a new payload/ID. Network/5xx retries retain it.
        if(['INVALID_CART','INVALID_PRODUCT','INVALID_QUANTITY','PAID_PRODUCT_REQUIRED','INVALID_ORDER','OUT_OF_STOCK','BREAD_OUT_OF_STOCK','SHOP_CLOSED','COUPON_INVALID','PRICE_CHANGED','REWARD_INVALID','REWARD_ALREADY_USED','REWARD_OUT_OF_STOCK','REWARD_NOT_CONFIGURED','LOCATION_REQUIRED','OUTSIDE_DELIVERY_AREA'].includes(e.code))await SecureSil(pendingKey);
        OzelUyariGoster(saved?'Sipariş alındı':'Sipariş gönderilemedi',saved?'Sipariş kaydedildi. Yeni sipariş göndermeden Siparişlerim ekranını kontrol edin.':escapeHTML(e.name==='AbortError'?'Yanıt gecikti. Tekrar denediğinizde aynı sipariş kontrol edilecek.':e.message||'Bağlantı kurulamadı. Aynı siparişle yeniden deneyebilirsiniz.'),'ℹ');
      }finally{isProcessingOrder=false;btn.classList.remove('loading');TogglePayButton();}
    }

    function CheckoutKapat() { let pu = document.getElementById("checkout-popup"); pu.classList.remove("active"); setTimeout(() => { pu.style.display = "none"; }, 500); }
    function BasariEkraniGoster() { let s = document.getElementById("success-overlay"); s.style.display = "flex"; setTimeout(() => s.classList.add("active"), 10); setTimeout(() => { s.classList.remove("active"); setTimeout(() => { s.style.display = "none"; SayfaGoster('gecmis'); }, 500); }, 3500); }

    // ==========================================
    // 8. ADİSYON DİNLEYİCİSİ VE UI ARAÇLARI
    // ==========================================
    function CanliAdisyonSayaciBaslat(orderTs) {
        if(adisyonSayacInterval) clearInterval(adisyonSayacInterval);
        const guncelleSayac = () => {
            let leftMs = 180000 - (GetServerTimeFast() - orderTs); let timeSpan = document.getElementById("adisyon-timer-span");
            if(!timeSpan) return;
            if (leftMs > 0) {
                let m = Math.floor(leftMs / 60000); let s = Math.floor((leftMs % 60000) / 1000);
                timeSpan.innerText = `${m}:${s < 10 ? '0'+s : s}`;
            } else { clearInterval(adisyonSayacInterval); AdisyonuGercekZamanliDinle(); }
        };
        guncelleSayac(); adisyonSayacInterval = setInterval(guncelleSayac, 1000);
    }

    function MenuyuGercekZamanliDinle() {
        if (menuDinleyiciRef) menuDinleyiciRef.off();
        menuDinleyiciRef = firebase.database().ref('MenuVersion');
        menuDinleyiciRef.on('value', async (snapshot) => {
            const vD=snapshot.val();
            // Versiyonu CanliMenuCek yenileyince güncelleriz; önceden değiştirmek yenilemeyi engelliyordu.
            if (vD && vD.v != sonMenuVersiyonu) await CanliMenuCek(false);
        }, error => console.warn('Menü dinleyicisi kapandı:',error?.code||'bağlantı'));
    }

    // Sipariş ekranından çıkılsa da müşteri, uygulama açıkken durum sesi alır.
    // Aynı sipariş için tek canlı dinleyici, çıkışlarda kapatılır.
    let bgDurumRef = null;
    let bgDurumSiparisId = '';
    async function SiparisDurumBildiriminiBaslat(siparisId) {
        const currentUser=firebase.auth().currentUser;
        if(!currentUser||typeof siparisId!=='string'||!/^[-A-Za-z0-9_]{15,128}$/.test(siparisId)){if(bgDurumRef)bgDurumRef.off();bgDurumRef=null;bgDurumSiparisId='';return;}
        const uid=currentUser.uid;
        if (siparisId===bgDurumSiparisId && bgDurumRef) return;
        if(bgDurumRef) bgDurumRef.off();
        bgDurumSiparisId=siparisId;
        bgDurumRef=firebase.database().ref(`CanliPaketler/${siparisId}/durum`);
        bgDurumRef.on('value', async snapshot => {
            const ham=snapshot.val(); if(!ham || firebase.auth().currentUser?.uid!==uid || bgDurumSiparisId!==siparisId) return;
            const durum=String(ham).toLocaleUpperCase('tr-TR');
            if(/TESLİM|AFİYET|TAMAM|İPTAL|RED/u.test(durum) && await SecureOku('bg_active_order_id')===siparisId)await SecureSil('bg_active_order_id');
            if(document.getElementById('history-container')?.style.display === 'block') return;
            const son=await SecureOku('bg_last_status');
            if(durum===son) return;
            await SecureKaydet('bg_last_status',durum);
            if(durum.includes('TESLİM')||durum.includes('AFİYET')) BildirimGonder('Siparişin Teslim Edildi','Afiyet olsun! Bekmez GO siparişin teslim edildi.');
            else if(durum.includes('YOLDA')||durum.includes('KURYE')) BildirimGonder('Siparişin Yolda','Kuryemiz siparişini teslim etmek üzere yola çıktı.');
            else if(durum.includes('HAZIRLAN')||durum.includes('MUTFAK')) BildirimGonder('Mutfağa İletildi','Siparişin hazırlanmaya başladı.');
            else if(durum.includes('İPTAL')||durum.includes('RED')) BildirimGonder('Sipariş Durumu','Siparişin iptal edildi; ayrıntılar için Takip ekranını aç.');
        }, e => console.warn('Sipariş durum bağlantısı:', e?.code||'bağlantı'));
    }

    async function AdisyonuGercekZamanliDinle() {
        let siparisId = await SecureOku("bg_active_order_id"); let authUser = firebase.auth().currentUser;
        if (!siparisId || !authUser) { document.getElementById("history-content").innerHTML = `<div class="empty-state-box">${emptyHistorySVG}<p>Aktif bir siparişiniz bulunmuyor.</p></div>`; if (aktifAdisyonDinleyiciRef) aktifAdisyonDinleyiciRef.off(); return; }
        
        if (aktifAdisyonDinleyiciRef) aktifAdisyonDinleyiciRef.off();
        aktifAdisyonDinleyiciRef = firebase.database().ref(`CanliPaketler/${siparisId}`);
        aktifAdisyonDinleyiciRef.on('value', async (snapshot) => { let bP = snapshot.val(); await AdisyonEkraniGuncelle(bP, siparisId); });
    }

    async function AdisyonEkraniGuncelle(bP, siparisId) {
        try {
            let authUser = firebase.auth().currentUser; 
            if(!authUser) { document.getElementById("history-content").innerHTML = `<div class="empty-state-box">${emptyHistorySVG}<p>Aktif bir siparişiniz bulunmuyor.</p></div>`; return; }

            let idToken = await authUser.getIdToken(false); let odemeTuru = await SecureOku("bg_odeme_turu") || "Kapıda Nakit"; let nakitDisiOdeme = !odemeTuru.includes("Nakit");

            if (!bP || bP.error) {
                let taslakRes = await fetch(`${FIREBASE_URL}/SiparisTaslaklari/${siparisId}.json?auth=${idToken}&t=${Date.now()}`); if(!taslakRes.ok)throw new Error("Sipariş bilgisi alınamadı"); let taslakData = await taslakRes.json();
                if (taslakData && !taslakData.error && taslakData.durum) {
                    let rawOrderTs = await SecureOku("bg_order_timestamp"); let orderTs = rawOrderTs ? ZamanMuhruOku(rawOrderTs, siparisId) : GetServerTimeFast();
                    let leftMs = 180000 - (GetServerTimeFast() - orderTs); let canEdit = false;
                    if(leftMs > 0 && orderTs > 0 && taslakData.durum === "KASA ONAYI BEKLENİYOR ⏳") { canEdit = true; }
                    
                    let butonlar = "";
                    if (canEdit) { 
                        if (nakitDisiOdeme) { butonlar = `<div style="text-align:center; font-size:12px; color:var(--warning); margin-top:20px; font-weight:700;">💳 Nakit dışı ödemeli (IBAN/Kart) siparişlerde iptal ve değişiklik için restoranı arayın.</div>`; } 
                        else { butonlar = `<div style="text-align:center; font-size:12px; color:var(--primary); font-weight:800; margin-top:20px;">⏳ Düzenleme için son <span id="adisyon-timer-span" style="font-size:16px;">...</span></div><div style="display:flex; gap:10px; margin-top:10px;"><button class="ripple-element" data-bkm-click="a90" style="flex:1; background:rgba(255,59,48,0.1); border:1px solid rgba(255, 59, 48, 0.5); color:var(--danger); padding:14px; border-radius:100px; font-weight:800; font-size:13px; cursor:pointer;">İptal Et</button><button class="ripple-element" data-bkm-click="a91" style="flex:1; background:rgba(255, 107, 0, 0.1); border:1px solid var(--primary); color:var(--primary); padding:14px; border-radius:100px; font-weight:800; font-size:13px; cursor:pointer;">Düzenle</button></div>`; } 
                    } else { butonlar = `<div style="text-align:center; font-size:11px; color:var(--warning); margin-top:20px; font-weight:700;">🔒 3 dakikalık süre doldu veya zaman manipülasyonu algılandı.</div>`; }

                    let hBekleme = `<div class="receipt-card"><div style="text-align: center; margin-bottom: 15px;"><div class="spinner" style="border-top-color:var(--primary); width:35px; height:35px; border-width:4px;"></div><div style="font-weight: 900; font-size: 20px; color:#1c1c1e;">KASA ONAYI BEKLENİYOR</div></div>${butonlar}</div>`;
                    
                    if (document.getElementById("history-content").innerHTML !== hBekleme) { document.getElementById("history-content").innerHTML = hBekleme; if (canEdit && !nakitDisiOdeme) CanliAdisyonSayaciBaslat(orderTs); } return; 
                } else {
                    window.isOrderFinished = false; document.getElementById("history-content").innerHTML = `<div class="empty-state-box">${emptyHistorySVG}<p>Aktif bir siparişiniz bulunmuyor.</p></div>`; 
                    sonCekilenAdisyonHTML = ""; await SecureSil("bg_active_order_id"); await SecureSil("bg_last_status"); await BuluttanAktifAdisyonuSil(); return;
                }
            }

            let canEdit=false,dR="",orderTs=0;
            let sipZamani = (bP && bP.timestamp) ? bP.timestamp : null; let isGhost = sipZamani ? ((Date.now() - sipZamani) > GHOST_TIMEOUT_MS) : false; let h = "";
            if(!bP || isGhost) { 
                window.isOrderFinished = false; h = `<div class="empty-state-box">${emptyHistorySVG}<p>Aktif bir siparişiniz bulunmuyor.</p></div>`; sonCekilenAdisyonHTML = "";
                await SecureSil("bg_active_order_id"); await SecureSil("bg_last_status"); await BuluttanAktifAdisyonuSil();
            } else {
                dR = bP.durum ? bP.durum.toUpperCase() : "SİPARİŞ ALINDI 🔔";
                let durumRenk = "var(--primary)"; let durumBg = "rgba(255,107,0,0.1)"; let durumIkon = "⏳"; let iptalButonuHTML = "";
                
                let oncekiDurum = await SecureOku("bg_last_status") || "";
                if (dR !== oncekiDurum) { await SecureKaydet("bg_last_status", dR); if (dR.includes("TESLİM") || dR.includes("AFİYET")) { BildirimGonder("Afiyet Olsun! 😋", "Bekmez GO: Siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkür ederiz!"); } else if (dR.includes("YOLDA") || dR.includes("KURYE")) { BildirimGonder("Kurye Yola Çıktı! 🛵", "Siparişiniz yola çıktı, gelmek üzere!"); } }

                let rawOrderTs = await SecureOku("bg_order_timestamp"); orderTs = rawOrderTs ? ZamanMuhruOku(rawOrderTs, siparisId) : 0;
                let leftMs = 180000 - (GetServerTimeFast() - orderTs); canEdit = false; let lockMsg = "Kasa siparişinizi işleme aldı. Değişiklik için işletmeyle iletişime geçin.";

                if (dR.includes("HAZIRLANIYOR") || dR.includes("SİPARİŞ ALINDI")) { durumRenk = "var(--primary)"; durumBg = "rgba(255,107,0,0.1)"; durumIkon = "👨‍🍳"; canEdit = false; }
                else if (dR.includes("PİŞİYOR") || dR.includes("MUTFAK")) { durumRenk = "var(--warning)"; durumBg = "rgba(255, 204, 0, 0.1)"; durumIkon = "🔥"; lockMsg = "Sipariş mutfakta işleme alındı."; }
                else if (dR.includes("YOLDA") || dR.includes("KURYE") || dR.includes("PAKET")) { durumRenk = "#0A84FF"; durumBg = "rgba(10, 132, 255, 0.1)"; durumIkon = "🛵"; lockMsg = "Kuryemiz yola çıktı."; }
                else if (dR.includes("İPTAL") || dR.includes("RED")) { durumRenk = "var(--danger)"; durumBg = "rgba(255, 59, 48, 0.1)"; durumIkon = "❌"; await BuluttanAktifAdisyonuSil(); }
                else if (dR.includes("TESLİM") || dR.includes("AFİYET") || dR.includes("TAMAM")) { 
                    durumRenk = "var(--success)"; durumBg = "rgba(52, 199, 89, 0.1)"; durumIkon = "✅"; await BuluttanAktifAdisyonuSil();
                    if (!window.isOrderFinished) { window.isOrderFinished = true; setTimeout(async () => { await SecureSil("bg_last_status"); await SecureSil("bg_active_order_id"); document.getElementById("history-content").innerHTML = `<div class="empty-state-box">${emptyHistorySVG}<p>Aktif bir siparişiniz bulunmuyor.</p></div>`; sonCekilenAdisyonHTML = ""; SayfaGoster('urunler'); OzelUyariGoster("Afiyet Olsun!", "Siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkür ederiz 😋", "🎉"); }, 6000); }
                }

                if (canEdit) { 
                    if (nakitDisiOdeme) { iptalButonuHTML = `<div style="text-align:center; font-size:12px; color:var(--warning); margin-top:20px; font-weight:700;">💳 Nakit dışı ödemeli (IBAN/Kart) siparişlerde iptal ve değişiklik için restoranı arayın.</div>`; } 
                    else { iptalButonuHTML = `<div style="text-align:center; font-size:12px; color:var(--primary); font-weight:800; margin-top:20px;">⏳ Düzenleme için son <span id="adisyon-timer-span" style="font-size:16px;">...</span></div><div style="display:flex; gap:10px; margin-top:10px;"><button class="ripple-element" data-bkm-click="a90" style="flex:1; background:rgba(255,59,48,0.1); border:1px solid rgba(255, 59, 48, 0.5); color:var(--danger); padding:14px; border-radius:100px; font-weight:800; font-size:13px; cursor:pointer;">İptal Et</button><button class="ripple-element" data-bkm-click="a91" style="flex:1; background:rgba(255, 107, 0, 0.1); border:1px solid var(--primary); color:var(--primary); padding:14px; border-radius:100px; font-weight:800; font-size:13px; cursor:pointer;">Düzenle</button></div>`; } 
                } else if (!dR.includes("İPTAL") && !dR.includes("TESLİM") && !dR.includes("RED") && !dR.includes("AFİYET")) { iptalButonuHTML = `<div style="text-align:center; font-size:11px; color:var(--warning); margin-top:15px; font-weight:700;">🔒 ${lockMsg} Artık değişiklik yapılamaz.</div>`; }

                if(dR.includes("İPTAL") || dR.includes("RED")) { h = `<div class="empty-text" style="color: var(--danger); border-color: rgba(255, 59, 48, 0.3); background: rgba(255, 59, 48, 0.05); padding: 40px 20px;"><div style="font-size:40px; margin-bottom:15px;">❌</div><strong style="font-size:18px;">İptal Edildi</strong><br><br><span style="font-size:14px; color:#A1A1AA;">${escapeHTML(dR)}</span></div>`; sonCekilenAdisyonHTML = ""; setTimeout(async () => { await SecureSil("bg_active_order_id"); }, 5000); } 
                else { h = `<div class="receipt-card"><div style="text-align: center; margin-bottom: 25px;"><div style="font-size:30px; margin-bottom:5px;">${durumIkon}</div><div style="font-weight: 900; font-size: 22px; color:#1c1c1e;">BEKMEZ GO</div><div style="font-size: 14px; font-weight: 800; color:var(--text-muted); margin-top:4px;">PAKET SERVİS</div></div><div class="receipt-header"><span>DURUM</span><span style="color:${durumRenk}; font-weight:900; background:${durumBg}; padding:8px 14px; border-radius:12px; text-align:right;">${escapeHTML(dR)}</span></div>`; if(bP.siparisler) { bP.siparisler.forEach(u => { h += `<div class="receipt-item"><span>${escapeHTML(u.itemName)}</span><span>${parseFloat(u.itemPrice).toFixed(2)} ₺</span></div>`; }); } if (bP.siparisNotu) { h += `<div style="margin-top: 20px; padding: 16px; background: rgba(0,0,0,0.03); border-radius:16px; font-size: 13px; font-weight: 600; color:#8e8e93; border: 1px dashed #d1d1d6;">NOT:<br>${escapeHTML(bP.siparisNotu)}</div>`; } h += `<div class="receipt-total">TOPLAM: <span style="font-size:28px; display:block; margin-top:8px;">${parseFloat(bP.toplamTutar).toFixed(2)} TL</span></div>${iptalButonuHTML}<div style="text-align: center; font-size: 11px; margin-top: 25px; color:#a1a1aa; font-weight: 600;">Bizi tercih ettiğiniz için teşekkür ederiz.</div></div>`; sonCekilenAdisyonHTML = h; }
            }
            if (document.getElementById("history-content").innerHTML !== h) { document.getElementById("history-content").innerHTML = h; if (canEdit && !nakitDisiOdeme && !dR.includes("İPTAL")) CanliAdisyonSayaciBaslat(orderTs); }
        } catch(e) { document.getElementById("history-content").innerHTML = `<div class="empty-state-box"><p>Sipariş bilgisi şu anda alınamıyor. Kaydınız korunuyor; yeni sipariş vermeden bağlantıyı kontrol edin.</p></div>`; }
    }

    async function BuluttanAktifAdisyonuSil(){ /* Sipariş bağlantısını yetkili sunucu yönetir. */ }

    let customerCancelBusy=false;
    async function CustomerCancel(editing){
      if(customerCancelBusy)return;customerCancelBusy=true;
      try{
        const id=await SecureOku('bg_active_order_id'),identity=await WheelIdentity();if(!id||!identity)return;
        const result=await CustomerService('/orders/cancel',{orderId:id,telefon:identity.tel,editing});
        if(editing){
          let stored;try{stored=JSON.parse(await SecureOku('bg_order_edit_'+id));}catch(_){}
          sepet=Array.isArray(stored?.cart)&&stored.cart.length?stored.cart:result.cart.map(r=>({rawName:r.rawName,baseName:r.tamIsim,baseStockAmount:r.miktar,quantity:1,basePrice:r.linePrice||0,menuRecipe:r.recipeKey}));
          document.getElementById('siparis-notu').value=result.note||'';aktifKuponKodu='';aktifKuponIndirimTutari=0;
          if(result.reward)await WheelRestoreGift(result.reward);SepetEkraniniCiz();await HesaplaVeGuncelle();
        }
        await SecureSil('bg_active_order_id');await SecureSil('bg_last_status');await SecureSil('last_ord_t');await SecureSil('bg_order_edit_'+id);
        if(aktifAdisyonDinleyiciRef){aktifAdisyonDinleyiciRef.off();aktifAdisyonDinleyiciRef=null;}
        document.getElementById('history-content').innerHTML=`<div class="empty-state-box"><p>Sipariş iptal edildi.</p></div>`;
        SayfaGoster(editing?'sepet':'urunler');OzelUyariGoster(editing?'Sepetiniz hazır':'Sipariş iptal edildi',editing?'Ürünleriniz sepete geri yüklendi. Kupon koşulları yeni siparişte yeniden kontrol edilir.':'Siparişiniz kasa işleme almadan iptal edildi.','✅');
      }catch(e){OzelUyariGoster('İşlem tamamlanamadı',escapeHTML(e.message||'Bağlantınızı kontrol edin.'),'ℹ');}
      finally{customerCancelBusy=false;}
    }
    async function IptalOnaySor(){SoruSor('Siparişi iptal et','Sipariş henüz kasa tarafından işleme alınmadıysa iptal edilir. Devam edilsin mi?','❌',()=>CustomerCancel(false),true);}
    async function DuzenleOnaySor(){SoruSor('Siparişi düzenle','Sipariş kasa tarafından alınmadıysa iptal edilip ürünler sepete geri yüklenecek. Devam edilsin mi?','✏️',()=>CustomerCancel(true),false);}

    /* İşletme tarafından yayından önce doldurulmalıdır. Markayı tüzel kişi unvanı olarak kullanmayın. */
    const LEGAL_BUSINESS = { controllerName: '', address: '', applicationContact: '', taxInfo: '', retentionPolicy: '', transferDetails: '' };
    const LEGAL_CONTENT = {
      kvkk: {title:'Kişisel verileriniz',summary:'Hangi bilgileri neden kullandığımızı ve haklarınızı burada inceleyebilirsiniz. Bu bilgilendirme, açık rıza talebi değildir.',sections:()=>[
        ['Veri sorumlusu ve başvuru', LEGAL_BUSINESS.controllerName && LEGAL_BUSINESS.address && LEGAL_BUSINESS.applicationContact ? `${LEGAL_BUSINESS.controllerName}. Adres: ${LEGAL_BUSINESS.address}. Başvuru: ${LEGAL_BUSINESS.applicationContact}.` : 'Veri sorumlusunun resmi unvanı, adresi ve başvuru kanalı işletme tarafından henüz tamamlanmamıştır. Bu bölüm nihai aydınlatma metni değildir. Bilgi almak için işletmeyle iletişime geçin.'],
        ['Toplanan bilgiler ve kullanım amaçları','Hesap için e-posta ve telefon; sipariş için ad, teslimat adresi, sepet ve sipariş bilgileri kullanılır. Konum izni verirseniz teslimat bölgesini kontrol etmek için konumunuz alınır. Başarılı bölge kontrolünden sonra tam GPS koordinatları yeni sipariş kayıtlarına yazılmaz. Yanıtı belirsiz bir gönderim, sonucu doğrulanana kadar cihazdaki şifreli bekleyen kayıtta tutulabilir. Hesap ve oturum bilgileri cihazınızda saklanabilir. Güvenlik ve kötüye kullanım kontrollerinde kimlik doğrulama bilgileri işlenir.'],
        ['Toplama yöntemi ve hukuki sebepler','Bilgiler uygulamadaki formlar, hesap doğrulaması ve izin verdiğiniz cihaz özellikleri üzerinden elektronik olarak alınır. Siparişin kurulması ve ifası için gerekli veriler sözleşmenin ifası; mevzuatın zorunlu kıldığı işlemler hukuki yükümlülük kapsamında değerlendirilebilir. İşletme, her veri işleme amacı için geçerli hukuki sebebi ve varsa açık rıza gerektiren süreçleri ayrıca belirlemelidir.'],
        ['Hizmet sağlayıcılar ve aktarım',LEGAL_BUSINESS.transferDetails || 'Uygulama Google Firebase, Cloudflare ve görseller için Supabase hizmetlerini kullanır; doğrulama/iletişimde WhatsApp kullanılabilir. Bu hizmetler veri işlenmesine ve yapılandırmaya göre yurt dışına aktarıma yol açabilir. İşletme, alıcıları, aktarım amaçlarını ve uygulanacak hukuki güvenceleri yayından önce bu alanda açıklamalıdır.'],
        ['Saklama ve cihaz izinleri',LEGAL_BUSINESS.retentionPolicy || 'Saklama süreleri ve silme politikası işletme tarafından belirlenmelidir. Hesabı uygulamadan silmek, mevzuat gereği saklanan tüm kayıtların anında silindiği anlamına gelmez. Konum ve bildirim izinlerini cihazınızın veya tarayıcınızın ayarlarından yönetebilirsiniz.'],
        ['Haklarınız','KVKK madde 11 kapsamında verilerinizin işlenip işlenmediğini öğrenme, bilgi isteme, işlenme amacını ve aktarılan kişileri öğrenme; düzeltme, şartları varsa silme/yok etme ve ilgili kişilere bildirim isteme; yalnız otomatik analizle aleyhinize çıkan sonuca itiraz etme ve hukuka aykırı işleme nedeniyle zararın giderilmesini talep etme haklarınız vardır. Başvurunuzu yukarıdaki veri sorumlusu kanalına iletebilirsiniz.']
      ]},
      mesafeli:{title:'Sipariş ve satış bilgileri',summary:'Siparişi göndermeden önce ürünleri, miktarları, toplam bedeli ve teslimat adresini kontrol edin.',sections:()=>[
        ['Satıcı bilgileri',LEGAL_BUSINESS.controllerName && LEGAL_BUSINESS.address ? `${LEGAL_BUSINESS.controllerName} — ${LEGAL_BUSINESS.address}. ${LEGAL_BUSINESS.taxInfo}` : 'Satıcının resmi unvanı, açık adresi ve gerekli kayıt/iletişim bilgileri işletme tarafından tamamlanmalıdır. Bu bilgilendirme tek başına eksiksiz mesafeli satış sözleşmesi değildir.'],
        ['Siparişin durumu','Gönderilen sipariş kasa onayını bekler. Güncel durumu Siparişlerim ekranından takip edin. Bağlantı kesildiğinde tekrar sipariş oluşturmadan önce bu ekranı kontrol edin.'],
        ['Bedel ve teslimat','Ürünler, miktarlar ve uygulanan indirimler sepetinizde gösterilir. Teslimat adresinin doğruluğundan emin olun. İşletme; ödeme yöntemi, varsa ek ücretler ve teslimat şartlarını sipariş öncesinde açıkça bildirmelidir.'],
        ['Tüketici hakları','Çabuk bozulabilen veya son kullanma tarihi geçebilecek mallar gibi mevzuattaki istisnalar cayma hakkını etkileyebilir. Bu durum ayıplı, eksik veya yanlış ürün teslimindeki yasal haklarınızı ortadan kaldırmaz. Uyuşmazlıklarda mevzuata göre tüketici hakem heyeti veya tüketici mahkemesine başvurulabilir.']
      ]},
      teslimat:{title:'Teslimat hakkında',summary:'Doğru adres ve ulaşılabilir bir telefon, siparişinizin sorunsuz ulaşmasını sağlar.',sections:()=>[
        ['Teslimat bölgesi','Uygulama konumunuzu teslimat alanıyla karşılaştırır. Konum alınamazsa tarayıcı ve işletim sistemi izinlerini kontrol edin. İşletmenin belirlediği teslimat alanı dışında sipariş kabul edilmeyebilir.'],
        ['Adres ve teslimat süresi','Açık adresinizi, bina/daire bilgilerini ve gerekiyorsa teslimat notunu yazın. Hazırlık, yoğunluk ve yol koşulları teslimat süresini etkileyebilir. Bu metin kesin bir teslimat süresi taahhüdü içermez; siparişinizin durumunu takip ekranından kontrol edin.'],
        ['Eksik veya yanlış teslimat','Sorunu ve sipariş bilginizi işletmeye iletin. Sipariş kayıtlarını ve varsa ilgili görselleri koruyun. Yasal haklarınız saklıdır.']
      ]},
      iptal:{title:'İptal ve destek',summary:'Siparişinizi değiştirmek veya bir sorun bildirmek için durumuna göre aşağıdaki yolu izleyin.',sections:()=>[
        ['Kasa onayından önce','Siparişlerim ekranında iptal seçeneği görünüyorsa iptal talebini buradan gönderin. İşlemin tamamlandığını güncel sipariş durumundan doğrulayın.'],
        ['Kasa onayından sonra','Hazırlık başlamışsa uygulamadan iptal seçeneği bulunmayabilir. İşletmeyle iletişime geçin; talebiniz siparişin durumu ve yasal haklarınız çerçevesinde değerlendirilir.'],
        ['İade ve sorun çözümü','Gıda ürünlerinde cayma hakkının istisnaları bulunabilir. Eksik, yanlış veya ayıplı teslimatla ilgili haklarınız korunur. İşletmeye sipariş numaranızla ulaşın; gerekli düzeltme veya iade süreci somut duruma göre belirlenir.']
      ]}
    };
    function AcSozlesme(tip) {
      const info=LEGAL_CONTENT[tip];if(!info)return;
      document.getElementById('legal-title').textContent=info.title;
      const body=document.getElementById('legal-body');body.replaceChildren();
      const intro=document.createElement('p');intro.className='legal-summary';intro.textContent=info.summary;body.append(intro);
      info.sections().forEach(([title,text],index)=>{const section=document.createElement('details');section.className='legal-section';section.open=index===0;const heading=document.createElement('summary');heading.textContent=title;const p=document.createElement('p');p.textContent=text;section.append(heading,p);body.append(section);});
      const footer=document.createElement('div');footer.className='legal-footer';footer.textContent='Bekmez GO · Bilgilendirme merkezi';body.append(footer);
      const contact=document.createElement('a');contact.href='https://wa.me/'+DUKKAN_WHATSAPP_NUMARASI;contact.target='_blank';contact.rel='noopener noreferrer';contact.textContent='İşletmeyle iletişime geç';body.append(contact);
      PremiumDialogOpen('legal-popup');body.scrollTop=0;
    }
    function KapatSozlesme(){PremiumDialogClose('legal-popup');}


    function TetiklePwaPrompt() { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then((c) => { if (c.outcome === 'accepted') { CloseFullscreenPrompt(); } deferredPrompt = null; }); } else { OzelUyariGoster("Zaten Yüklü", "Uygulama cihazınıza zaten yüklü veya tarayıcınız PWA desteklemiyor. (Safari: Paylaş > Ana Ekrana Ekle)", "ℹ"); } }
    function CloseFullscreenPrompt() { let e = document.getElementById('pwa-fullscreen-prompt'); e.classList.remove('active'); setTimeout(() => { e.style.display = 'none'; }, 400); }
    function ManuelUygulamaIndir() { let e = document.getElementById('pwa-fullscreen-prompt'); if (e) { e.style.display = 'flex'; setTimeout(() => { e.classList.add('active'); }, 10); } }



// Fixed, reviewed handlers. No eval, Function constructor, inline script or runtime code parser.
const BKM_ACTIONS={
"a1":function(event){window.location.reload(true);},
"a2":function(event){SayfaGoster('urunler')},
"a3":function(event){SayfaGoster('firsatlar')},
"a4":function(event){SayfaGoster('sepet')},
"a5":function(event){SayfaGoster('gecmis')},
"a6":function(event){SayfaGoster('profil')},
"a7":function(event){CloseFullscreenPrompt()},
"a8":function(event){TetiklePwaPrompt()},
"a9":function(event){ManuelUygulamaIndir()},
"a10":function(event){ZararliKarakterTemizle(this); UrunAra()},
"a11":function(event){AramayiTemizle()},
"a12":function(event){KategoriSec('Ana Yemek', this);},
"a13":function(event){KategoriSec('İçecek', this);},
"a14":function(event){KategoriSec('Ekstra', this);},
"a15":function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();CarkPopupAc();}},
"a16":function(event){CarkPopupAc()},
"a17":function(event){CarkHediyesiniKullan()},
"a18":function(event){CarkHediyesiIptal()},
"a19":function(event){if(event.key === 'Enter') KuponSorgula()},
"a20":function(event){ZararliKarakterTemizle(this)},
"a21":function(event){KuponSorgula()},
"a22":function(event){CheckoutPopupAc();},
"a23":function(event){BildirimIzniAc()},
"a24":function(event){AuthModuDegistir('login')},
"a25":function(event){AuthModuDegistir('register')},
"a26":function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}},
"a27":function(event){SifreGosterGizle('login-pass', this)},
"a28":function(event){GirisYapTetikle()},
"a29":function(event){document.getElementById('chk-isim').value = this.value},
"a30":function(event){FormatTelefon(this)},
"a31":function(event){CanliSifreKontrolu(this.value)},
"a32":function(event){SifreGosterGizle('prof-password', this)},
"a33":function(event){KayitOnayToggle()},
"a34":function(event){AcSozlesme('kvkk')},
"a35":function(event){AcSozlesme('mesafeli')},
"a36":function(event){YeniNesilKayitOl()},
"a37":function(event){DashboardSekmeSec('Teslimat')},
"a38":function(event){DashboardSekmeSec('Guvenlik')},
"a39":function(event){document.getElementById('chk-adres').value = this.value},
"a40":function(event){ProfiliKaydet()},
"a41":function(event){SadeceCikisYap()},
"a42":function(event){HesabiTamamenSil()},
"a43":function(event){if(event.target === this) CarkPopupKapat();},
"a44":function(event){CarkPopupKapat()},
"a45":function(event){CarkCevir()},
"a46":function(event){if(event.target === this) WheelResultClose();},
"a47":function(event){WheelResultClose()},
"a48":function(event){if(event.target === this) PopupKapat();},
"a49":function(event){PopupKapat()},
"a50":function(event){PopupIciMiktarDegistir(-1)},
"a51":function(event){PopupIciMiktarDegistir(1)},
"a52":function(event){PopupSifirla()},
"a53":function(event){PopupSepeteEkle()},
"a54":function(event){if(event.target === this) CheckoutKapat();},
"a55":function(event){CheckoutKapat()},
"a56":function(event){document.getElementById('prof-isim').value = this.value},
"a57":function(event){document.getElementById('prof-adres').value = this.value},
"a58":function(event){TogglePayButton()},
"a59":function(event){AcSozlesme('kvkk'); event.preventDefault();},
"a60":function(event){AcSozlesme('mesafeli'); event.preventDefault();},
"a61":function(event){AcSozlesme('teslimat'); event.preventDefault();},
"a62":function(event){AcSozlesme('iptal'); event.preventDefault();},
"a63":function(event){PaketSiparisiGonder()},
"a64":function(event){IptalEtEpostaBekleme(true)},
"a65":function(event){KapatConfirmModal(event)},
"a66":function(event){KapatConfirmModal(event, true)},
"a67":function(event){if(event.target === this) KapatSozlesme();},
"a68":function(event){KapatSozlesme()},
"a69":function(event){KapatUyariModal(event)},
"a70":function(event){KapatUyariModal(event, true)},
"a71":function(event){WhatsappMesajiGonder()},
"a72":function(event){IptalEtWhatsappBekleme()},
"a73":function(event){FotoUrunResimHatasi(this)},
"a74":function(event){EkstraIstekToggle(this, 'Zerzavatsız')},
"a75":function(event){EkstraIstekToggle(this, 'Ekmeksiz')},
"a76":function(event){EkstraIstekToggle(this, 'Domatessiz')},
"a77":function(event){EkstraIstekToggle(this, 'Maydanozsuz')},
"a78":function(event){EkstraIstekToggle(this, 'Sadece Pişecek')},
"a79":function(event){EkmekSayaciDegistir(-1)},
"a80":function(event){EkmekSayaciDegistir(1)},
"a81":function(event){OzelEkmekSec('1.5 Lavaş', this)},
"a82":function(event){OzelEkmekSec('Normal', this)},
"a83":function(event){OzelEkmekSec('3 Lavaş', this)},
"a84":function(event){EkstraIstekToggle(this, 'Soğansız')},
"a85":function(event){EkstraIstekToggle(this, 'Acısı İçinde')},
"a86":function(event){EkstraIstekToggle(this,'Soğansız')},
"a87":function(event){EkstraIstekToggle(this,'Maydanozsuz')},
"a88":function(event){EkstraIstekToggle(this,'Domatessiz')},
"a89":function(event){EkstraIstekToggle(this,'Sadece Pişecek')},
"a90":function(event){IptalOnaySor()},
"a91":function(event){DuzenleOnaySor()},
 product:function(){const i=Number(this.dataset.productIndex);if(!Number.isInteger(i)||i<0||i>=tumUrunler.length)return;if(this.dataset.soldout==='1')OzelUyariGoster('Tükendi','Bu ürün şu an stoklarımızda kalmamıştır.','🚫');else UrunPopupAc(i);},
 coupon:function(){KuponKopyala(this.dataset.coupon||'');},
 'cart-minus':function(){const i=Number(this.dataset.cartIndex);if(Number.isInteger(i)&&i>=0&&i<sepet.length)SepetMiktarDegistir(i,-1);},
 'cart-plus':function(){const i=Number(this.dataset.cartIndex);if(Number.isInteger(i)&&i>=0&&i<sepet.length)SepetMiktarDegistir(i,1);}
};
for(const type of ['click','change','input','keydown','keyup','error'])document.addEventListener(type,event=>{
 let el=event.target;while(el&&el!==document){const key=el.getAttribute?.('data-bkm-'+type);if(key&&Object.hasOwn(BKM_ACTIONS,key)){try{const result=BKM_ACTIONS[key].call(el,event);if(result?.catch)result.catch(e=>OzelUyariGoster('İşlem tamamlanamadı',escapeHTML(e?.message||'Tekrar deneyin.'),'⚠'));}catch(e){OzelUyariGoster('İşlem tamamlanamadı',escapeHTML(e?.message||'Tekrar deneyin.'),'⚠');}break;}el=el.parentElement;}
},type==='error');
if(window.top!==window.self)document.documentElement.hidden=true;
