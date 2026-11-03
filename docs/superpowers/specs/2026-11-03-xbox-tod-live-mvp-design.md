# TOD Xbox Canlı Yayın Uygulaması (MVP) — Tasarım Belgesi (Spec)

**Tarih:** 2026-11-03
**Durum:** Taslak — Kullanıcı İncelemesinde
**Hedef Platform:** Xbox Series X|S / Xbox One (65 inç 4K TV görünümü) + Geliştirme/Test için macOS

---

## 1. Amaç ve Kapsam (Phase 1 MVP)

Xbox uygulama mağazasında resmi bir TOD (`todtv.com.tr`) uygulaması bulunmamaktadır. Xbox'ın dahili Microsoft Edge / WebView2 motoru `todtv.com.tr` üzerindeki canlı yayınları oynatabilmekte, ancak standart web arayüzü 65 inç TV ekranında uzaktan okunamamakta ve Xbox kolu (Gamepad) ile kontrolü çok zor olmaktadır.

Bu ilk sürümün (MVP) tek amacı:
1. **Kullanıcı Girişi (Login) ve Kalıcı Oturum:** İlk açılışta Xbox kolu ve ekran klavyesi ile kolayca TOD hesabına giriş yapılmasını ve oturumun (`Cookies` / `localStorage`) kalıcı olarak saklanmasını sağlamak.
2. **Canlı Yayın (Canlı TV / Süper Lig Maçları) Seçimi:** Giriş sonrasında doğrudan canlı yayın listesine odaklanarak, sanal fare imlecine ihtiyaç duymadan **Yön Tuşları (D-Pad)** ile kanal/maç seçimi yapmak.
3. **65 İnç TV Arayüzü ve Tek Tuşla Tam Ekran:** Uzaktan (2.5–3.5 metre) net görünen parlak odak çerçevesi (Focus Ring) sunmak ve tek tuşla (**X** veya otomatik) yayını **65 inç Tam Ekran** moduna geçirmek.

**Kapsam Dışı (YAGNI):**
- Dizi/film (VOD) katalog gezintisi, arama motoru, profil yönetimi ve çoklu kamera/istatistik panelleri bu ilk sürümde yer almayacaktır.

---

## 2. Mimari ve Bileşenler

Proje, birbirinden bağımsız test edilebilen **2 ana birimden** oluşur:

```
TodMuadil/
├── src/
│   ├── core/
│   │   ├── gamepad-nav.js       # D-Pad uzamsal gezinti (Spatial Navigation) ve tuş atamaları
│   │   ├── login-helper.js      # Giriş formu algılama, ekran klavyesi tetikleme, oturum kontrolü
│   │   ├── live-player.js       # Canlı kanal listesi, tam ekran (Fullscreen) ve LB/RB kanal geçişi
│   │   └── tv-styles.css        # 65 inç TV odak çerçevesi, büyütülmüş fontlar ve HUD göstergesi
│   └── index.js                 # Tek dosya halinde birleştirilmiş enjeksiyon paketi (tod-xbox-live.bundle.js)
├── xbox-uwp/                    # Xbox Native WebView2 UWP Uygulama Kabuğu (C# / XAML)
│   ├── MainPage.xaml
│   ├── MainPage.xaml.cs         # CoreWebView2 başlatma, kalıcı çerez profili ve script enjeksiyonu
│   └── Package.appxmanifest     # Xbox Console (Windows.Xbox) tam ekran uygulama tanımı
├── tools/
│   └── dev-preview-server.js    # Mac/Xbox Edge üzerinde kurulumsuz hızlı test ve Bookmarklet sunucusu
└── .github/workflows/
    └── build-xbox-appx.yml      # macOS kullandığımız için bulutta otomatik .msixbundle derleyicisi
```

### Birim 1: Çekirdek Xbox TV & Gamepad Motoru (`src/core/`)
`todtv.com.tr` sayfasının içine enjekte edilen bağımsız JavaScript/CSS katmanıdır:
- **`gamepad-nav.js`:** `requestAnimationFrame` döngüsüyle `navigator.getGamepads()` API'sini okur (test için klavye yön tuşlarını da destekler). Sayfadaki tıklanabilir canlı kanal kartlarını ve giriş formu elemanlarını 2 boyutlu koordinatlarına (`getBoundingClientRect()`) göre indeksler ve D-Pad basışlarında en yakın elemana odaklanır.
- **`login-helper.js`:** Kullanıcının giriş yapıp yapmadığını denetler. Giriş sayfasındaysa sırasıyla *E-posta/Telefon*, *Şifre*, *(varsa OTP/SMS kodu)* ve *Giriş Yap* butonlarını odak listesine alır. Bir `<input>` elemanında **A** tuşuna basıldığında `element.focus()` ve `element.click()` çağırarak Xbox ekran klavyesini açar.
- **`live-player.js`:** Sayfadaki aktif `<video>` (veya Bitmovin/Shaka oynatıcı kapsayıcısı) elemanını bulur. Yayın başladığında sesi açık (`muted = false`) hale getirir, **X** tuşuyla tam ekran (`requestFullscreen()` veya CSS sabit tam ekran `100vw x 100vh`) modunu açıp kapatır, **LB / RB** tuşlarıyla listedeki önceki/sonraki canlı kanala geçer.
- **`tv-styles.css`:** 65 inç TV için seçili elemanın etrafına `4px solid #00e676` parlak yeşil çerçeve, yumuşak parlama (`box-shadow`) ve hafif büyütme (`transform: scale(1.04)`) uygular. Ekranın alt köşesinde 65 inçten okunabilir bir **Xbox Tuş Rehberi HUD** (`[A] Seç/Oynat  [X] Tam Ekran  [B] Geri  [LB/RB] Kanal Değiştir`) gösterir (tam ekranda 3 saniye sonra otomatik gizlenir).

### Birim 2: Xbox Uygulama Kabuğu (`xbox-uwp/` & `tools/`)
1. **Xbox UWP WebView2 Kabuğu (`xbox-uwp/`):**
   - Xbox'ın varsayılan sanal fare imlecini (`RequiresPointerMode = WhenRequested`) devre dışı bırakır.
   - TV ekran kenar boşluklarını (Overscan) sıfırlar (`ApplicationViewBoundsMode.UseCoreWindow`).
   - `CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync` ile her sayfa yüklendiğinde `tod-xbox-live.bundle.js` kodunu otomatik çalıştırır.
   - Başlangıç adresi olarak `https://www.todtv.com.tr/canli-tv` adresini açar ve kullanıcı verilerini `ApplicationData.Current.LocalFolder` altında kalıcı tutar.
2. **Hızlı Test Sunucusu / Bookmarklet (`tools/dev-preview-server.js`):**
   - UWP paketini derlemeden önce hem Mac'te hem de Xbox Edge tarayıcısında tek tıkla test edebilmek için yerel ağ üzerinden script sunan hafif yardımcı araç.

---

## 3. Xbox Kolu (Gamepad) Tuş Haritası

| Xbox Tuşu | Klavye Karşılığı (Mac Testi) | İşlev |
|---|---|---|
| **D-Pad / Sol Analog** | Yön Tuşları (`↑` `↓` `←` `→`) | Giriş kutuları veya Canlı Kanallar arasında gezinme |
| **A (Yeşil)** | `Enter` | Seçili kanalı açma / Giriş kutusunda ekran klavyesini açma |
| **B (Kırmızı)** | `Escape` / `Backspace` | Tam ekrandan çıkma / Bir önceki ekrana dönme |
| **X (Mavi)** | `F` | Videoyu **65 inç Tam Ekran** yapma / Tam ekrandan çıkarma |
| **Y (Sarı)** | `C` | Doğrudan **Canlı TV (`https://www.todtv.com.tr/canli-tv`)** sayfasına gitme |
| **LB / RB** | `[` / `]` | Önceki / Sonraki canlı kanala hızlı geçiş |

---

## 4. Hata Yönetimi ve Kenar Durumlar (Edge Cases)

1. **Oturum Düşmesi / Giriş Yapılmamış Olması:** Kullanıcı `/canli-tv` sayfasındayken TOD giriş ekranına yönlendirirse veya "Giriş Yap" butonu görünürse, motor otomatik olarak odağı giriş formuna taşır.
2. **Tarayıcı Tam Ekran Kısıtlaması (`requestFullscreen`):** Bazı gömülü oynatıcılarda standart `requestFullscreen()` API'si engellenirse, yedek mekanizma olarak video kapsayıcısına `position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 999999; background: #000;` uygulanarak %100 garantili 65 inç tam ekran görünümü sağlanır.
3. **Dinamik Yüklenen Kanal Kartları (SPA / React):** TOD web arayüzü dinamik yüklendiği için `MutationObserver` ile DOM değişiklikleri izlenir; yeni kanal kartları ekrana geldiğinde odak listesi otomatik güncellenir.

---

## 5. Doğrulama ve Test Stratejisi

1. **Birim Testleri (Vitest / JSDOM):**
   - Uzamsal gezinti (`gamepad-nav.js`): 2B düzlemde yukarı/aşağı/sağ/sol tuşlarına basıldığında doğru kanal kartının seçildiğinin doğrulanması.
   - Giriş yardımcısı (`login-helper.js`): E-posta, şifre ve giriş butonlarının doğru sırayla odaklandığının doğrulanması.
   - Canlı oynatıcı (`live-player.js`): **X** tuşuyla tam ekran geçişinin (hem standart API hem CSS fallback) ve **LB/RB** kanal değiştirmenin doğrulanması.
2. **Canlı Önizleme Testi:**
   - Önce Mac üzerinde örnek/canlı sayfada klavye veya kol ile test, ardından Xbox üzerinde gerçek kol ve 65 inç TV ile doğrulama.
