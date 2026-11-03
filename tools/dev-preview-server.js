import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const bundlePath = path.join(rootDir, 'dist/tod-xbox-live.bundle.js');
const TOD_LIVE_URL = 'https://www.todtv.com.tr/canli-tv/bein-sports-1?c=spor';

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

export function createPreviewServer() {
  return http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.url && req.url.startsWith('/tod-xbox-live.bundle.js')) {
      const code = fs.readFileSync(bundlePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(code);
      return;
    }

    const bundleJs = fs.readFileSync(bundlePath, 'utf8').trim();
    const inlineBookmarklet = `javascript:${encodeURI(`(function(){${bundleJs}})();`)}`;

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TOD Xbox • Kurulum Köprüsü</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 0%, #1e293b 0%, #090d16 70%);
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 24px;
    }
    .bridge-card {
      width: 100%;
      max-width: 680px;
      background: rgba(15, 23, 42, 0.78);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 32px 36px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #34d399;
      background: rgba(16, 185, 129, 0.14);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 12px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    p.sub {
      margin: 0 0 24px;
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 22px;
    }
    .btn {
      appearance: none;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-primary {
      background: #10b981;
      color: #042f2e;
      border-color: #34d399;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.07);
      color: #f8fafc;
    }
    .steps {
      background: rgba(9, 13, 22, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 14px;
      padding: 16px 20px;
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.65;
    }
    .steps ol {
      margin: 6px 0 0;
      padding-left: 18px;
    }
    .status {
      margin-top: 12px;
      font-size: 13px;
      color: #34d399;
      min-height: 20px;
    }
  </style>
</head>
<body>
  <div class="bridge-card">
    <div class="badge">Xbox Edge • Yol 1</div>
    <h1>TOD Canlı TV & Kol Kontrol Köprüsü</h1>
    <p class="sub">Xbox Edge tarayıcısında gerçek <b>todtv.com.tr</b> üzerinde kol kontrollerini ve hızlı kanal barını çalıştırmak için:</p>

    <div class="actions">
      <button id="copy-bookmarklet-btn" class="btn btn-primary" type="button">
        1. TV Modu Kodunu Kopyala
      </button>
      <a id="open-tod-btn" class="btn btn-secondary" href="${TOD_LIVE_URL}">
        2. Gerçek TOD Canlı TV'yi Aç →
      </a>
    </div>

    <div class="steps">
      <b>Xbox Edge'de Kalıcı Favori (Yer İmi) Yapma (Sadece 1 Kez):</b>
      <ol>
        <li>Yukarıdaki <b>"1. TV Modu Kodunu Kopyala"</b> butonuna kolun <b>A</b> tuşuyla basın.</li>
        <li>Xbox Edge adres çubuğunun yanındaki <b>☆ (Favorilere Ekle)</b> ikonuna basıp bu sayfayı kaydedin, ardından Favoriler listesinden <b>Düzenle (URL)</b> kısmına kopyaladığınız kodu yapıştırın.</li>
        <li><b>"2. Gerçek TOD Canlı TV'yi Aç"</b> butonuna basın; TOD açıldığında Favorilerden bu yer imine tıkladığınız an <b>Hızlı Kanal Barı (Y tuşu)</b> ve <b>Tam Ekran (X tuşu)</b> aktif olur.</li>
      </ol>
    </div>

    <div id="copy-status" class="status"></div>
  </div>

  <textarea id="bookmarklet-raw" style="position:fixed;left:-9999px;top:-9999px;" readonly>${inlineBookmarklet}</textarea>
  <script>
    const INLINE_BOOKMARKLET_CODE = document.getElementById('bookmarklet-raw').value;
    const copyBtn = document.getElementById('copy-bookmarklet-btn');
    const statusEl = document.getElementById('copy-status');

    copyBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(INLINE_BOOKMARKLET_CODE);
        } else {
          const raw = document.getElementById('bookmarklet-raw');
          raw.select();
          document.execCommand('copy');
        }
        statusEl.textContent = '✓ TV Modu kodu panoya kopyalandı! Şimdi Favori URL’sine yapıştırabilir veya 2. adıma geçebilirsiniz.';
      } catch (err) {
        statusEl.textContent = 'Kopyalama başarısız oldu: ' + err.message;
      }
    });
  </script>
  <script src="/tod-xbox-live.bundle.js"></script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 4173);
  const server = createPreviewServer();
  server.listen(port, '0.0.0.0', () => {
    console.log(`TOD Xbox Köprü Sunucusu aktif:`);
    console.log(`  Xbox Edge'den girin: http://${getLocalIp()}:${port}`);
  });
}
