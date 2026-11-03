import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const START_URL = 'https://www.todtv.com.tr/canli-tv/bein-sports-1?c=spor';
const DEBUG_PORT = Number(process.env.TOD_DEBUG_PORT || 9233);
const rootDir = path.resolve(import.meta.dirname, '..');
const bundlePath = path.join(rootDir, 'dist/tod-xbox-live.bundle.js');
const profileDir = path.join(rootDir, '.tod-app-profile');

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
];

function findBrowserExecutable() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Google Chrome veya Microsoft Edge bulunamadı.');
}

function sendCdpCommands(wsUrl, commands) {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const key = crypto.randomBytes(16).toString('base64');

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Key': key,
        'Sec-WebSocket-Version': '13'
      }
    });

    req.on('upgrade', (res, socket) => {
      for (const cmd of commands) {
        const payload = Buffer.from(JSON.stringify(cmd), 'utf8');
        const mask = crypto.randomBytes(4);
        let header;
        if (payload.length < 126) {
          header = Buffer.alloc(2);
          header[0] = 0x81;
          header[1] = 0x80 | payload.length;
        } else if (payload.length < 65536) {
          header = Buffer.alloc(4);
          header[0] = 0x81;
          header[1] = 0x80 | 126;
          header.writeUInt16BE(payload.length, 2);
        } else {
          header = Buffer.alloc(10);
          header[0] = 0x81;
          header[1] = 0x80 | 127;
          header.writeBigUInt64BE(BigInt(payload.length), 2);
        }
        const masked = Buffer.alloc(payload.length);
        for (let i = 0; i < payload.length; i++) {
          masked[i] = payload[i] ^ mask[i % 4];
        }
        socket.write(Buffer.concat([header, mask, masked]));
      }
      setTimeout(() => {
        socket.end();
        resolve();
      }, 150);
    });

    req.on('error', reject);
    req.end();
  });
}

async function fetchTargets() {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  return res.json();
}

export async function launchTodDesktopApp() {
  const browserBin = findBrowserExecutable();
  const bundleJs = fs.readFileSync(bundlePath, 'utf8');
  fs.mkdirSync(profileDir, { recursive: true });

  const child = spawn(
    browserBin,
    [
      `--app=${START_URL}`,
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--window-size=1440,900',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    { stdio: 'ignore', detached: false }
  );

  const attachedTargets = new Set();

  async function syncTargets() {
    try {
      const targets = await fetchTargets();
      for (const t of targets) {
        if (t.type === 'page' && t.webSocketDebuggerUrl && !attachedTargets.has(t.id)) {
          attachedTargets.add(t.id);
          await sendCdpCommands(t.webSocketDebuggerUrl, [
            { id: 1, method: 'Page.enable', params: {} },
            { id: 2, method: 'Page.addScriptToEvaluateOnNewDocument', params: { source: bundleJs } },
            { id: 3, method: 'Runtime.evaluate', params: { expression: bundleJs } }
          ]);
        } else if (t.type === 'page' && t.webSocketDebuggerUrl) {
          // Ensure script stays active after full-page navigations on todtv.com.tr
          await sendCdpCommands(t.webSocketDebuggerUrl, [
            { id: 4, method: 'Runtime.evaluate', params: { expression: bundleJs } }
          ]);
        }
      }
    } catch {
      // Wait for browser debugging port to come up
    }
  }

  const interval = setInterval(syncTargets, 1200);
  child.on('exit', () => {
    clearInterval(interval);
    process.exit(0);
  });

  console.log(`Gerçek TOD TV Uygulama Penceresi açıldı: ${START_URL}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  launchTodDesktopApp();
}
