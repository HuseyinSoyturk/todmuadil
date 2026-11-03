# Xbox TOD Canlı Yayın (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 MVP of the Xbox TOD application enabling gamepad-driven login, D-Pad live channel selection, and one-button 65-inch fullscreen playback via a bundled script (`tod-xbox-live.bundle.js`), an Xbox UWP WebView2 shell, and a local test/bookmarklet server.

**Architecture:** A modular JavaScript/CSS engine (`src/core/`) injected into `todtv.com.tr` provides 2D spatial navigation (`gamepad-nav.js`), login/on-screen keyboard handling (`login-helper.js`), and live video fullscreen/channel controls (`live-player.js`). It is packaged into a single zero-dependency bundle (`dist/tod-xbox-live.bundle.js`) consumed by both a native C# Xbox UWP WebView2 shell (`xbox-uwp/`) and a local preview/bookmarklet server (`tools/dev-preview-server.js`).

**Tech Stack:** Vanilla JavaScript (ES Modules), CSS3, Vitest + JSDOM (unit tests), esbuild (bundler), C# / UWP `Microsoft.UI.Xaml.Controls.WebView2`, GitHub Actions (`windows-latest`), Node.js HTTP server.

**Spec:** `docs/superpowers/specs/2026-11-03-xbox-tod-live-mvp-design.md`

## Global Constraints

- Target screen: 65-inch 4K TV (10-foot UI); focused elements must display `4px solid #00e676` border, glow `box-shadow`, and `transform: scale(1.04)`.
- Bottom HUD guide text: `[A] Seç/Oynat  [X] Tam Ekran  [B] Geri  [LB/RB] Kanal Değiştir`, auto-hiding after 3 seconds in fullscreen mode.
- Fullscreen fallback: when `requestFullscreen()` rejects or is blocked, apply fixed CSS fullscreen (`position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 999999; background: #000;`).
- Xbox UWP shell must disable virtual mouse pointer (`RequiresPointerMode = WhenRequested`), disable TV overscan margins (`ApplicationViewBoundsMode.UseCoreWindow`), persist session data in `ApplicationData.Current.LocalFolder`, and open `https://www.todtv.com.tr/canli-tv`.
- Scope strictly limited to Login + Live TV playback (no VOD catalogs, search UI, or profile management).

## Review Focus

- Hidden/zero-size DOM elements (`width: 0` or `display: none`) must be excluded from spatial navigation so D-Pad focus never lands on invisible traps.
- Rapid gamepad analog stick / D-Pad polling at 60fps must be debounced (e.g., 180ms cooldown) so one press moves focus by exactly one card.
- Pressing **A** on an `<input>` element must call both `.focus()` and `.click()` without losing focus to trigger the Xbox On-Screen Keyboard reliably.
- When `requestFullscreen()` throws or resolves without `document.fullscreenElement`, the CSS fallback class (`tod-xbox-forced-fullscreen`) must still activate on the video container and unmute the video.
- Dynamic SPA updates (`MutationObserver`) must keep the currently focused element stable if it still exists in the DOM instead of resetting focus to index 0 on every DOM mutation.

---

### Task 1: Project Setup, 65" TV Styles & Spatial Gamepad Navigator

**Files:**
- Create: `package.json`
- Create: `src/core/tv-styles.css`
- Create: `src/core/gamepad-nav.js`
- Test: `tests/gamepad-nav.test.js`

**Interfaces:**
- Consumes: DOM elements and `navigator.getGamepads()`
- Produces:
  - `src/core/tv-styles.css`: exports/provides CSS rules for `.tod-xbox-focus`, `.tod-xbox-forced-fullscreen`, and `#tod-xbox-hud`
  - `createSpatialNavigator(options?: { selector?: string, onAction?: (action: string, activeEl: HTMLElement | null) => void, cooldownMs?: number })` returning `{ refresh(): HTMLElement[], focusElement(el: HTMLElement): void, getActiveElement(): HTMLElement | null, move(direction: 'up' | 'down' | 'left' | 'right'): HTMLElement | null, triggerAction(action: 'A' | 'B' | 'X' | 'Y' | 'LB' | 'RB'): void, pollGamepad(gamepads?: any[]): void, destroy(): void }`

- [ ] **Step 1: Create `package.json` and write the failing test `tests/gamepad-nav.test.js`**

Create `package.json` with `"type": "module"`, scripts `"test": "vitest run"` and `"build": "node tools/build-bundle.js"`, and devDependencies `vitest`, `jsdom`, `esbuild`. Install dependencies, then write `tests/gamepad-nav.test.js`:

```javascript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSpatialNavigator } from '../src/core/gamepad-nav.js';

function mockRect(el, x, y, width = 200, height = 100) {
  el.getBoundingClientRect = () => ({
    left: x, top: y, right: x + width, bottom: y + height, width, height, x, y
  });
}

describe('createSpatialNavigator', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="grid">
        <button id="ch1" class="channel-card">beIN SPORTS 1</button>
        <button id="ch2" class="channel-card">beIN SPORTS 2</button>
        <button id="ch3" class="channel-card">beIN SPORTS 3</button>
        <button id="hidden" class="channel-card" style="display:none">Hidden</button>
      </div>
    `;
    mockRect(document.getElementById('ch1'), 50, 100);
    mockRect(document.getElementById('ch2'), 300, 100);
    mockRect(document.getElementById('ch3'), 50, 260);
    mockRect(document.getElementById('hidden'), 0, 0, 0, 0);
  });

  it('ignores zero-size/hidden elements and focuses first visible item', () => {
    const nav = createSpatialNavigator({ selector: '.channel-card' });
    const items = nav.refresh();
    expect(items.map(i => i.id)).toEqual(['ch1', 'ch2', 'ch3']);
    expect(nav.getActiveElement().id).toBe('ch1');
    expect(nav.getActiveElement().classList.contains('tod-xbox-focus')).toBe(true);
  });

  it('moves right and down in 2D space using Euclidean directional scoring', () => {
    const nav = createSpatialNavigator({ selector: '.channel-card' });
    nav.refresh();
    expect(nav.move('right').id).toBe('ch2');
    expect(nav.move('left').id).toBe('ch1');
    expect(nav.move('down').id).toBe('ch3');
    expect(nav.move('up').id).toBe('ch1');
  });

  it('debounces rapid gamepad polling and dispatches button actions', () => {
    const onAction = vi.fn();
    const nav = createSpatialNavigator({ selector: '.channel-card', onAction, cooldownMs: 180 });
    nav.refresh();

    const padRight = {
      buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 15 })),
      axes: [0, 0]
    };
    nav.pollGamepad([padRight], 1000);
    expect(nav.getActiveElement().id).toBe('ch2');

    // Immediate poll within cooldownMs should be ignored
    nav.pollGamepad([padRight], 1050);
    expect(nav.getActiveElement().id).toBe('ch2');

    // Press X (button 2) after cooldown
    const padX = {
      buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 2 })),
      axes: [0, 0]
    };
    nav.pollGamepad([padX], 1300);
    expect(onAction).toHaveBeenCalledWith('X', document.getElementById('ch2'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/gamepad-nav.test.js`
Expected: FAIL with cannot find module `../src/core/gamepad-nav.js`

- [ ] **Step 3: Implement `src/core/tv-styles.css` and `src/core/gamepad-nav.js`**

In `src/core/tv-styles.css`, define `.tod-xbox-focus` (`outline: 4px solid #00e676 !important; box-shadow: 0 0 24px rgba(0, 230, 118, 0.75) !important; transform: scale(1.04) !important; transition: transform 0.15s ease, box-shadow 0.15s ease !important; z-index: 9999 !important;`), `.tod-xbox-forced-fullscreen` (`position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 999999 !important; background: #000 !important;`), and `#tod-xbox-hud`.
In `src/core/gamepad-nav.js`, implement `createSpatialNavigator` with 2D center-to-center cone filtering (`dx`, `dy`), `cooldownMs = 180` debounce, keyboard listener (`ArrowUp/Down/Left/Right`, `Enter`->`A`, `Escape/Backspace`->`B`, `f/F`->`X`, `c/C`->`Y`, `[`->`LB`, `]`->`RB`), and `MutationObserver` that preserves `activeEl` if still in DOM.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/gamepad-nav.test.js`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/core/tv-styles.css src/core/gamepad-nav.js tests/gamepad-nav.test.js
git commit -m "feat: add 65-inch TV styles and 2D spatial gamepad navigator"
```

---

### Task 2: Login Form Helper & Xbox On-Screen Keyboard Trigger

**Files:**
- Create: `src/core/login-helper.js`
- Test: `tests/login-helper.test.js`

**Interfaces:**
- Consumes: DOM login inputs/buttons
- Produces:
  - `detectLoginState(doc?: Document): { isLoginVisible: boolean, hasLoginTrigger: boolean, elements: HTMLElement[] }`
  - `activateLoginElement(el: HTMLElement): 'input-focused' | 'submitted' | 'clicked'`

- [ ] **Step 1: Write the failing test `tests/login-helper.test.js`**

```javascript
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { detectLoginState, activateLoginElement } from '../src/core/login-helper.js';

describe('login-helper', () => {
  it('detects login form inputs and submit button in priority order', () => {
    document.body.innerHTML = `
      <form id="login-form">
        <input id="username" type="text" placeholder="Cep Telefonu veya E-posta" />
        <input id="password" type="password" placeholder="Şifre" />
        <button id="submit-btn" type="submit">Giriş Yap</button>
      </form>
    `;
    const state = detectLoginState(document);
    expect(state.isLoginVisible).toBe(true);
    expect(state.elements.map(e => e.id)).toEqual(['username', 'password', 'submit-btn']);
  });

  it('calls focus() and click() on input elements when A is pressed to open Xbox OSK', () => {
    document.body.innerHTML = `<input id="username" type="text" />`;
    const input = document.getElementById('username');
    const focusSpy = vi.spyOn(input, 'focus');
    const clickSpy = vi.spyOn(input, 'click');

    const result = activateLoginElement(input);
    expect(result).toBe('input-focused');
    expect(focusSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/login-helper.test.js`
Expected: FAIL with cannot find module `../src/core/login-helper.js`

- [ ] **Step 3: Implement `src/core/login-helper.js`**

Implement `detectLoginState(doc = document)` to find visible username/email/phone/OTP `<input>` fields, `<input type="password">`, and submit/login buttons (`Giriş Yap`, `Oturum Aç`, `Devam Et`), and `activateLoginElement(el)` to call `el.focus()` + `el.click()` on `<input>`/`<textarea>` (returning `'input-focused'`) or click/submit on buttons.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/login-helper.test.js`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add src/core/login-helper.js tests/login-helper.test.js
git commit -m "feat: add gamepad login form helper and Xbox OSK trigger"
```

---

### Task 3: Live Broadcast Player Controller, 65" Fullscreen Engine & Bundle

**Files:**
- Create: `src/core/live-player.js`
- Create: `src/index.js`
- Create: `tools/build-bundle.js`
- Test: `tests/live-player.test.js`

**Interfaces:**
- Consumes: `createSpatialNavigator` from `src/core/gamepad-nav.js`, `detectLoginState` / `activateLoginElement` from `src/core/login-helper.js`
- Produces:
  - `createLivePlayerController(doc?: Document)` returning `{ toggleFullscreen(): Promise<boolean>, exitFullscreen(): Promise<boolean>, isFullscreen(): boolean, switchChannel(delta: -1 | 1): HTMLElement | null, getChannelElements(): HTMLElement[], ensureUnmutedPlaying(): void }`
  - `initTodXboxLive(doc?: Document): { nav, player, hud }` in `src/index.js`
  - Bundled script `dist/tod-xbox-live.bundle.js`

- [ ] **Step 1: Write the failing test `tests/live-player.test.js`**

```javascript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLivePlayerController } from '../src/core/live-player.js';

describe('createLivePlayerController', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="channel-list">
        <a id="bein1" class="live-channel-item active" href="/canli-izle/bein-sports-1">beIN SPORTS 1</a>
        <a id="bein2" class="live-channel-item" href="/canli-izle/bein-sports-2">beIN SPORTS 2</a>
      </div>
      <div id="player-wrapper" class="player-container">
        <video id="live-video" muted></video>
      </div>
    `;
  });

  it('activates forced 65-inch CSS fullscreen and unmutes video when requestFullscreen is unavailable or fails', async () => {
    const controller = createLivePlayerController(document);
    const video = document.getElementById('live-video');
    const wrapper = document.getElementById('player-wrapper');
    wrapper.requestFullscreen = vi.fn().mockRejectedValue(new Error('Blocked by WebView'));

    const isFs = await controller.toggleFullscreen();
    expect(isFs).toBe(true);
    expect(wrapper.classList.contains('tod-xbox-forced-fullscreen')).toBe(true);
    expect(video.muted).toBe(false);

    const afterExit = await controller.toggleFullscreen();
    expect(afterExit).toBe(false);
    expect(wrapper.classList.contains('tod-xbox-forced-fullscreen')).toBe(false);
  });

  it('switches to next and previous live channel on LB/RB', () => {
    const controller = createLivePlayerController(document);
    const bein2 = document.getElementById('bein2');
    const clickSpy = vi.spyOn(bein2, 'click');

    const next = controller.switchChannel(1);
    expect(next.id).toBe('bein2');
    expect(clickSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/live-player.test.js`
Expected: FAIL with cannot find module `../src/core/live-player.js`

- [ ] **Step 3: Implement `src/core/live-player.js`, `src/index.js`, and `tools/build-bundle.js`**

Implement `createLivePlayerController` in `src/core/live-player.js`, wire up HUD + `createSpatialNavigator` + `detectLoginState` + `createLivePlayerController` in `src/index.js` (including 3-second HUD auto-hide in fullscreen), and implement `tools/build-bundle.js` using `esbuild` to bundle `src/index.js` and inline `src/core/tv-styles.css` into `dist/tod-xbox-live.bundle.js`.

- [ ] **Step 4: Run tests and build bundle to verify**

Run: `npm test && npm run build`
Expected: All tests PASS and `dist/tod-xbox-live.bundle.js` is generated.

- [ ] **Step 5: Commit**

```bash
git add src/core/live-player.js src/index.js tools/build-bundle.js dist/tod-xbox-live.bundle.js tests/live-player.test.js
git commit -m "feat: add live broadcast fullscreen controller and bundle"
```

---

### Task 4: Xbox UWP WebView2 Shell, GitHub Actions Workflow & Local Preview Server

**Files:**
- Create: `xbox-uwp/Package.appxmanifest`
- Create: `xbox-uwp/MainPage.xaml`
- Create: `xbox-uwp/MainPage.xaml.cs`
- Create: `xbox-uwp/TodXboxApp.csproj`
- Create: `.github/workflows/build-xbox-appx.yml`
- Create: `tools/dev-preview-server.js`
- Test: `tests/integration-packaging.test.js`

**Interfaces:**
- Consumes: `dist/tod-xbox-live.bundle.js`
- Produces:
  - Xbox UWP WebView2 project (`xbox-uwp/`) configured for `Windows.Xbox` with `RequiresPointerMode = WhenRequested` and `ApplicationViewBoundsMode.UseCoreWindow`
  - `.github/workflows/build-xbox-appx.yml` CI workflow for building `.msixbundle`/`.appxbundle` on `windows-latest`
  - `tools/dev-preview-server.js` HTTP server exporting `createPreviewServer()` for testing Login + Live TV + Xbox Edge Bookmarklet

- [ ] **Step 1: Write the failing test `tests/integration-packaging.test.js`**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration-packaging.test.js`
Expected: FAIL with ENOENT `xbox-uwp/MainPage.xaml.cs`

- [ ] **Step 3: Implement `xbox-uwp/`, `.github/workflows/build-xbox-appx.yml`, and `tools/dev-preview-server.js`**

Create the UWP files (`Package.appxmanifest`, `MainPage.xaml`, `MainPage.xaml.cs`, `TodXboxApp.csproj`) embedding/loading `tod-xbox-live.bundle.js` into `CoreWebView2` on `https://www.todtv.com.tr/canli-tv`, create `.github/workflows/build-xbox-appx.yml`, and create `tools/dev-preview-server.js` providing both a local interactive simulation of TOD Login + Live TV (with `tod-xbox-live.bundle.js` active) and a one-click Bookmarklet installer page for Xbox Edge.

- [ ] **Step 4: Run all tests to verify everything passes**

Run: `npm test`
Expected: PASS (all 4 test suites passing)

- [ ] **Step 5: Commit**

```bash
git add xbox-uwp/ .github/workflows/build-xbox-appx.yml tools/dev-preview-server.js tests/integration-packaging.test.js
git commit -m "feat: add Xbox UWP WebView2 shell, CI builder, and preview server"
```

