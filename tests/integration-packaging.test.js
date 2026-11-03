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

  it('serves a sleek Xbox Edge bridge page on / with self-contained inline HTTPS-safe bookmarklet code and direct TOD link', async () => {
    const { createPreviewServer } = await import('../tools/dev-preview-server.js');
    const server = createPreviewServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      const html = await res.text();
      expect(html).toContain('id="copy-bookmarklet-btn"');
      expect(html).toContain('https://www.todtv.com.tr/canli-tv/bein-sports-1?c=spor');
      expect(html).toContain('INLINE_BOOKMARKLET_CODE');
    } finally {
      server.close();
    }
  });

  it('includes complete UWP solution files (App.xaml, App.xaml.cs, Default.rd.xml, Assets) and MSBuild AppxBundle step in CI workflow', () => {
    expect(fs.existsSync(path.resolve('xbox-uwp/App.xaml'))).toBe(true);
    expect(fs.existsSync(path.resolve('xbox-uwp/App.xaml.cs'))).toBe(true);
    expect(fs.existsSync(path.resolve('xbox-uwp/Properties/Default.rd.xml'))).toBe(true);
    expect(fs.existsSync(path.resolve('xbox-uwp/Assets/StoreLogo.png'))).toBe(true);
    expect(fs.existsSync(path.resolve('xbox-uwp/Assets/Square150x150Logo.png'))).toBe(true);
    expect(fs.existsSync(path.resolve('xbox-uwp/Assets/Square44x44Logo.png'))).toBe(true);

    const wf = fs.readFileSync(path.resolve('.github/workflows/build-xbox-appx.yml'), 'utf8');
    expect(wf).toContain('msbuild');
    expect(wf).toContain('GenerateAppxPackageOnBuild=true');
    expect(wf).toContain('AppPackages');
  });
});

