import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const bundlePath = path.join(rootDir, 'dist/tod-xbox-live.bundle.js');

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

    const host = req.headers.host || `${getLocalIp()}:4173`;
    const bookmarkletCode = `javascript:(function(){var s=document.createElement('script');s.src='http://${host}/tod-xbox-live.bundle.js?t='+Date.now();document.body.appendChild(s);})();`;

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>TOD Xbox 65" Canlı Yayın & Giriş Test Ekranı</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #0c1017;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 32px 48px 110px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      border-bottom: 1px solid #1f2937;
      padding-bottom: 18px;
    }
    .logo {
      font-size: 36px;
      font-weight: 900;
      color: #00e676;
      letter-spacing: 2px;
    }
    .status-badge {
      background: #1f2937;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 18px;
      color: #9ca3af;
    }
    .layout {
      display: grid;
      grid-template-columns: 420px 1fr;
      gap: 32px;
      align-items: start;
    }
    .card {
      background: #141b26;
      border: 1px solid #263244;
      border-radius: 16px;
      padding: 24px;
    }
    h2 {
      margin-top: 0;
      font-size: 24px;
      color: #fff;
    }
    .form-group {
      margin-bottom: 16px;
    }
    input[type="text"], input[type="password"] {
      width: 100%;
      padding: 16px;
      font-size: 20px;
      border-radius: 10px;
      border: 2px solid #374151;
      background: #0b0f17;
      color: #fff;
    }
    button.primary-btn {
      width: 100%;
      padding: 16px;
      font-size: 22px;
      font-weight: 700;
      border-radius: 10px;
      border: none;
      background: #00e676;
      color: #06130c;
      cursor: pointer;
    }
    .channel-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .live-channel-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      background: #1e293b;
      border-radius: 12px;
      color: #fff;
      text-decoration: none;
      font-size: 22px;
      font-weight: 700;
      border: 2px solid transparent;
    }
    .live-channel-item.active {
      background: #064e3b;
      border-color: #10b981;
    }
    .live-tag {
      background: #ef4444;
      color: #fff;
      font-size: 14px;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .player-container {
      background: #000;
      border-radius: 16px;
      overflow: hidden;
      position: relative;
      border: 2px solid #1f2937;
    }
    video {
      width: 100%;
      height: 430px;
      display: block;
      background: #000;
    }
    .channel-overlay {
      position: absolute;
      top: 20px;
      left: 24px;
      background: rgba(0,0,0,0.75);
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 22px;
      font-weight: 700;
      color: #00e676;
      pointer-events: none;
    }
    .bookmarklet-box {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid #263244;
      font-size: 16px;
      color: #9ca3af;
    }
    .bookmarklet-link {
      display: inline-block;
      margin-top: 8px;
      padding: 10px 16px;
      background: #2563eb;
      color: #fff;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 700;
    }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <header>
    <div class="logo">TOD XBOX • 65" CANLI YAYIN</div>
    <div id="session-status" class="status-badge">Oturum: Giriş Bekleniyor</div>
  </header>

  <div class="layout">
    <div class="card">
      <div id="login-panel">
        <h2>1. Adım: TOD Hesap Girişi</h2>
        <form id="login-form">
          <div class="form-group">
            <input id="username" type="text" placeholder="E-posta veya Cep Telefonu" value="5551234567" />
          </div>
          <div class="form-group">
            <input id="password" type="password" placeholder="Şifre" value="••••••••" />
          </div>
          <button id="submit-btn" class="primary-btn" type="submit">Giriş Yap</button>
        </form>
      </div>

      <div id="logged-in-panel" class="hidden">
        <h2>Oturum Açık (Kalıcı Çerez Aktif)</h2>
        <p style="font-size:18px;color:#cbd5e1;">Artık doğrudan sağdaki Canlı Kanallar arasında kolun <b>Yön Tuşları (D-Pad)</b> ile gezinebilir ve <b>X (veya F)</b> tuşuyla 65 inç Tam Ekran yapabilirsiniz.</p>
        <button id="logout-btn" class="primary-btn" style="background:#ef4444;color:#fff;margin-top:12px;">Çıkış Yap (Girişi Sıfırla)</button>
      </div>

      <div class="bookmarklet-box">
        <div><b>Xbox Edge Hızlı Kısayol:</b></div>
        <a class="bookmarklet-link" href="${bookmarkletCode}">🎮 TOD Xbox TV Modu</a>
      </div>
    </div>

    <div class="card">
      <h2>2. Adım: Canlı TV Kanalları (Süper Lig)</h2>
      <div class="channel-list">
        <a id="ch-bein1" class="live-channel-item active" href="#bein-sports-1" data-title="beIN SPORTS 1 HD — Süper Lig Canlı">
          <span>beIN SPORTS 1</span><span class="live-tag">CANLI</span>
        </a>
        <a id="ch-bein2" class="live-channel-item" href="#bein-sports-2" data-title="beIN SPORTS 2 HD — Premier League">
          <span>beIN SPORTS 2</span><span class="live-tag">CANLI</span>
        </a>
        <a id="ch-bein3" class="live-channel-item" href="#bein-sports-3" data-title="beIN SPORTS 3 HD — Bundesliga">
          <span>beIN SPORTS 3</span><span class="live-tag">CANLI</span>
        </a>
        <a id="ch-bein4" class="live-channel-item" href="#bein-sports-4" data-title="beIN SPORTS HABER HD">
          <span>beIN SPORTS HABER</span><span class="live-tag">CANLI</span>
        </a>
      </div>

      <div id="player-wrapper" class="player-container">
        <div id="channel-banner" class="channel-overlay">beIN SPORTS 1 HD — Süper Lig Canlı</div>
        <video id="live-video" controls autoplay loop muted playsinline
          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"></video>
      </div>
    </div>
  </div>

  <script>
    const loginForm = document.getElementById('login-form');
    const loginPanel = document.getElementById('login-panel');
    const loggedInPanel = document.getElementById('logged-in-panel');
    const sessionStatus = document.getElementById('session-status');
    const logoutBtn = document.getElementById('logout-btn');
    const banner = document.getElementById('channel-banner');

    function syncAuthUi() {
      const loggedIn = localStorage.getItem('tod_xbox_demo_auth') === '1';
      if (loggedIn) {
        loginPanel.classList.add('hidden');
        loggedInPanel.classList.remove('hidden');
        sessionStatus.textContent = 'Oturum: Açık (Kalıcı)';
        sessionStatus.style.color = '#00e676';
      } else {
        loginPanel.classList.remove('hidden');
        loggedInPanel.classList.add('hidden');
        sessionStatus.textContent = 'Oturum: Giriş Bekleniyor';
        sessionStatus.style.color = '#9ca3af';
      }
      if (window.__TOD_XBOX_LIVE_ACTIVE__) {
        window.__TOD_XBOX_LIVE_ACTIVE__.nav.refresh();
      }
    }

    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      localStorage.setItem('tod_xbox_demo_auth', '1');
      syncAuthUi();
    });

    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('tod_xbox_demo_auth');
      syncAuthUi();
    });

    document.querySelectorAll('.live-channel-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.live-channel-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        banner.textContent = item.getAttribute('data-title');
      });
    });

    syncAuthUi();
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
    console.log(`TOD Xbox Test Server running at:`);
    console.log(`  Local (Mac):  http://localhost:${port}`);
    console.log(`  Xbox (LAN):   http://${getLocalIp()}:${port}`);
  });
}

