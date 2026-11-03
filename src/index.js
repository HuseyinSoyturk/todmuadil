import { createSpatialNavigator } from './core/gamepad-nav.js';
import { detectLoginState, activateLoginElement, setupTodLoginCaptchaHandler } from './core/login-helper.js';
import { createLivePlayerController, QUICK_CHANNELS } from './core/live-player.js';

export const HUD_TEXT = '[A] Seç  [X/F] Tam Ekran  [Y/C] Kanallar  [LB/RB] Kanal Değiştir';

function repairLegacyTodBundleIfNeeded(doc) {
  const win = doc.defaultView || window;
  if (typeof win.BC !== 'undefined' || win.__TOD_BC_REPAIRED__) return;
  const scriptEl = doc.querySelector('script[src*="bundle-bc"]');
  if (!scriptEl || !scriptEl.src || typeof win.fetch !== 'function') return;
  win.__TOD_BC_REPAIRED__ = true;
  win
    .fetch(scriptEl.src)
    .then(function (r) {
      return r.text();
    })
    .then(function (code) {
      const patched = code.replace(/packageBtn\?\.element/g, '(packageBtn && packageBtn.element)');
      const s = doc.createElement('script');
      s.textContent = patched;
      (doc.head || doc.documentElement).appendChild(s);
    })
    .catch(function () {});
}

export function initTodXboxLive(doc = document, injectedCss = '') {
  const win = doc.defaultView || window;
  setupTodLoginCaptchaHandler(doc);
  repairLegacyTodBundleIfNeeded(doc);

  if (win.__TOD_XBOX_LIVE_ACTIVE__) {
    return win.__TOD_XBOX_LIVE_ACTIVE__;
  }

  if (injectedCss && !doc.getElementById('tod-xbox-tv-styles')) {
    const styleEl = doc.createElement('style');
    styleEl.id = 'tod-xbox-tv-styles';
    styleEl.textContent = injectedCss;
    (doc.head || doc.documentElement).appendChild(styleEl);
  }

  let dock = doc.getElementById('tod-xbox-channel-dock');
  if (!dock && doc.body) {
    dock = doc.createElement('nav');
    dock.id = 'tod-xbox-channel-dock';
    for (const ch of QUICK_CHANNELS) {
      const link = doc.createElement('a');
      link.id = ch.id;
      link.className = 'tod-xbox-dock-item';
      link.href = ch.url;
      link.textContent = ch.label;
      if (win.location && win.location.href && win.location.href.includes(ch.url.replace('https://www.todtv.com.tr', ''))) {
        link.classList.add('active');
      }
      dock.appendChild(link);
    }
    doc.body.appendChild(dock);
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
    hudTimer = setTimeout(() => {
      if (hud) {
        hud.classList.add('tod-xbox-hud-hidden');
      }
    }, 3500);
  }

  const nav = createSpatialNavigator({
    document: doc,
    getCandidates(d) {
      setupTodLoginCaptchaHandler(d);
      if (dock && dock.classList.contains('tod-xbox-dock-open')) {
        return Array.from(dock.querySelectorAll('.tod-xbox-dock-item'));
      }
      const loginState = detectLoginState(d);
      const channels = player.getChannelElements();
      const others = Array.from(
        d.querySelectorAll('button, a[href], input:not([type="hidden"]), [role="button"]')
      ).filter(el => !el.closest('#tod-xbox-channel-dock'));
      if (loginState.isLoginVisible && loginState.elements.length > 0) {
        return [...loginState.elements, ...channels, ...others];
      }
      return [...channels, ...others];
    },
    async onAction(action, activeEl) {
      pulseHud();

      if (action === 'A') {
        if (!activeEl) return;
        const loginState = detectLoginState(doc);
        if (
          loginState.elements.includes(activeEl) ||
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA'
        ) {
          activateLoginElement(activeEl);
        } else {
          activeEl.click();
          setTimeout(() => player.ensureUnmutedPlaying(), 150);
        }
      } else if (action === 'X') {
        await player.toggleFullscreen();
        pulseHud();
      } else if (action === 'B') {
        if (dock && dock.classList.contains('tod-xbox-dock-open')) {
          dock.classList.remove('tod-xbox-dock-open');
          nav.refresh();
          return;
        }
        if (player.isFullscreen()) {
          await player.exitFullscreen();
          pulseHud();
        } else if (win.history && win.history.length > 1) {
          win.history.back();
        }
      } else if (action === 'Y') {
        if (dock) {
          const isOpen = dock.classList.toggle('tod-xbox-dock-open');
          if (isOpen) {
            const firstItem = dock.querySelector('.tod-xbox-dock-item.active') || dock.querySelector('.tod-xbox-dock-item');
            if (firstItem) nav.focusElement(firstItem);
          } else {
            nav.refresh();
          }
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
  pulseHud();
  const instance = { nav, player, hud, dock };
  win.__TOD_XBOX_LIVE_ACTIVE__ = instance;
  return instance;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const boot = () => {
    const css = typeof window.__TOD_XBOX_INLINE_CSS__ === 'string'
      ? window.__TOD_XBOX_INLINE_CSS__
      : '';
    initTodXboxLive(document, css);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
