import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Xbox UWP & Preview Server artifacts', () => {
  it('configures MainPage.xaml.cs with Xbox pointer suppression, overscan removal, and script injection', () => {
    const cs = fs.readFileSync(path.resolve('xbox-uwp/MainPage.xaml.cs'), 'utf8');
    expect(cs).toContain('RequiresPointerMode');
    expect(cs).toContain('ApplicationViewBoundsMode.UseCoreWindow');
    expect(cs).toContain('AddScriptToExecuteOnDocumentCreatedAsync');
    expect(cs).toContain('https://www.todtv.com.tr/canli-tv');
  });

  it('includes Windows.Xbox target device family in Package.appxmanifest', () => {
    const manifest = fs.readFileSync(path.resolve('xbox-uwp/Package.appxmanifest'), 'utf8');
    expect(manifest).toContain('Windows.Xbox');
  });

  it('serves the JavaScript bundle when requested with a cache-busting query string (?t=...)', async () => {
    const { createPreviewServer } = await import('../tools/dev-preview-server.js');
    const server = createPreviewServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/tod-xbox-live.bundle.js?t=123456`);
      expect(res.headers.get('content-type')).toContain('application/javascript');
      const body = await res.text();
      expect(body).toContain('__TOD_XBOX_INLINE_CSS__');
    } finally {
      server.close();
    }
  });

  it('configures tod-desktop-app.js to launch real todtv.com.tr in app mode and inject the bundle via CDP', () => {
    const appCode = fs.readFileSync(path.resolve('tools/tod-desktop-app.js'), 'utf8');
    expect(appCode).toContain('https://www.todtv.com.tr/canli-tv/bein-sports-1?c=spor');
    expect(appCode).toContain('Page.addScriptToEvaluateOnNewDocument');
  });
});

