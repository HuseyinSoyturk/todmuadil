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
});

