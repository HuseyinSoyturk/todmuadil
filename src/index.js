import { createSpatialNavigator } from './core/gamepad-nav.js';
import { detectLoginState, activateLoginElement } from './core/login-helper.js';
import { createLivePlayerController } from './core/live-player.js';

export const HUD_TEXT = '[A] Seç/Oynat  [X] Tam Ekran  [B] Geri  [LB/RB] Kanal Değiştir';

export function initTodXboxLive(doc = document, injectedCss = '') {
  const win = doc.defaultView || window;
  if (win.__TOD_XBOX_LIVE_ACTIVE__) {
    return win.__TOD_XBOX_LIVE_ACTIVE__;
  }

  if (injectedCss && !doc.getElementById('tod-xbox-tv-styles')) {
    const styleEl = doc.createElement('style');
    styleEl.id = 'tod-xbox-tv-styles';
    styleEl.textContent = injectedCss;
    (doc.head || doc.documentElement).appendChild(styleEl);
  }

  let hud = doc.getElementById('tod-xbox-hud');
  if (!hud && doc.body) {
    hud = doc.createElement('div');
    hud.id = 'tod-xbox-hud';
    hud.textContent = HUD_TEXT;
    doc.body.appendChild(hud);
  }

  let hudTimer = null;
  const player = createLivePlayerController(doc);

  function pulseHud() {
    if (!hud) return;
    hud.classList.remove('tod-xbox-hud-hidden');
    if (hudTimer) clearTimeout(hudTimer);
    if (player.isFullscreen()) {
      hudTimer = setTimeout(() => {
        if (player.isFullscreen() && hud) {
          hud.classList.add('tod-xbox-hud-hidden');
        }
      }, 3000);
    }
  }

  const nav = createSpatialNavigator({
    document: doc,
    getCandidates(d) {
      const loginState = detectLoginState(d);
      if (loginState.isLoginVisible && loginState.elements.length > 0) {
        return loginState.elements;
      }
      const channels = player.getChannelElements();
      const others = Array.from(
        d.querySelectorAll('button, a[href], input:not([type="hidden"]), [role="button"]')
      );
      return [...channels, ...others];
    },
    async onAction(action, activeEl) {
      pulseHud();

      if (action === 'A') {
        if (!activeEl) return;
        const loginState = detectLoginState(doc);
        if (loginState.isLoginVisible || activeEl.tagName === 'INPUT') {
          activateLoginElement(activeEl);
        } else {
          activeEl.click();
          setTimeout(() => player.ensureUnmutedPlaying(), 150);
        }
      } else if (action === 'X') {
        await player.toggleFullscreen();
        pulseHud();
      } else if (action === 'B') {
        if (player.isFullscreen()) {
          await player.exitFullscreen();
          pulseHud();
        } else if (win.history && win.history.length > 1) {
          win.history.back();
        }
      } else if (action === 'Y') {
        if (win.location && !win.location.pathname.includes('/canli-tv')) {
          win.location.href = 'https://www.todtv.com.tr/canli-tv';
        }
      } else if (action === 'LB') {
        const target = player.switchChannel(-1);
        if (target) nav.focusElement(target);
      } else if (action === 'RB') {
        const target = player.switchChannel(1);
        if (target) nav.focusElement(target);
      }
    }
  });

  nav.refresh();
  const instance = { nav, player, hud };
  win.__TOD_XBOX_LIVE_ACTIVE__ = instance;
  return instance;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const boot = () => {
    const css = typeof globalThis.__TOD_XBOX_INLINE_CSS__ === 'string'
      ? globalThis.__TOD_XBOX_INLINE_CSS__
      : '';
    initTodXboxLive(document, css);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
