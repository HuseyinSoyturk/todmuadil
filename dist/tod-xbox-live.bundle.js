globalThis.__TOD_XBOX_INLINE_CSS__ = "/* Sleek Apple TV / Smart TV Style Overlay for Real todtv.com.tr */\n\n/* Hide TOD web clutter (chat bubble, cookie banner, footer badges) */\n#digito-chat,\n#bc-btn-digito-chat,\n#bc-btn-digito-chat-maximize,\n#app_cookieconsent,\n#ETBIS,\n.etbis {\n  display: none !important;\n}\n\n/* Subtle, modern focus halo */\n.tod-xbox-focus {\n  outline: 2px solid rgba(255, 255, 255, 0.95) !important;\n  outline-offset: 2px !important;\n  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.38), 0 6px 18px rgba(0, 0, 0, 0.45) !important;\n  transition: outline 0.12s ease, box-shadow 0.12s ease !important;\n  position: relative;\n  z-index: 9999 !important;\n}\n\n/* Guaranteed 100vw x 100vh Fullscreen Player Mode */\n.tod-xbox-forced-fullscreen {\n  position: fixed !important;\n  inset: 0 !important;\n  top: 0 !important;\n  left: 0 !important;\n  width: 100vw !important;\n  height: 100vh !important;\n  max-width: 100vw !important;\n  max-height: 100vh !important;\n  z-index: 999998 !important;\n  background: #000 !important;\n}\n\n.tod-xbox-forced-fullscreen video {\n  width: 100vw !important;\n  height: 100vh !important;\n  object-fit: contain !important;\n  background: #000 !important;\n}\n\n/* Glassmorphic Top Quick-Channel Dock */\n#tod-xbox-channel-dock {\n  position: fixed;\n  top: 14px;\n  left: 50%;\n  transform: translateX(-50%) translateY(-140%);\n  opacity: 0;\n  pointer-events: none;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 6px 10px;\n  background: rgba(15, 23, 42, 0.84);\n  backdrop-filter: blur(16px);\n  -webkit-backdrop-filter: blur(16px);\n  border: 1px solid rgba(255, 255, 255, 0.14);\n  border-radius: 999px;\n  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);\n  z-index: 1000001;\n  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;\n  max-width: 96vw;\n  overflow-x: auto;\n}\n\n#tod-xbox-channel-dock.tod-xbox-dock-open {\n  transform: translateX(-50%) translateY(0);\n  opacity: 1;\n  pointer-events: auto;\n}\n\n.tod-xbox-dock-item {\n  appearance: none;\n  border: 1px solid rgba(255, 255, 255, 0.08);\n  background: rgba(255, 255, 255, 0.06);\n  color: #f1f5f9;\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;\n  font-size: 13px;\n  font-weight: 500;\n  padding: 6px 13px;\n  border-radius: 999px;\n  cursor: pointer;\n  white-space: nowrap;\n  text-decoration: none;\n  transition: background 0.15s ease, color 0.15s ease;\n}\n\n.tod-xbox-dock-item:hover,\n.tod-xbox-dock-item.active {\n  background: rgba(16, 185, 129, 0.25);\n  border-color: rgba(16, 185, 129, 0.6);\n  color: #ffffff;\n}\n\n/* Subtle bottom-right mini controller pill */\n#tod-xbox-hud {\n  position: fixed;\n  bottom: 16px;\n  right: 18px;\n  background: rgba(15, 23, 42, 0.76);\n  backdrop-filter: blur(12px);\n  -webkit-backdrop-filter: blur(12px);\n  color: rgba(241, 245, 249, 0.88);\n  border: 1px solid rgba(255, 255, 255, 0.12);\n  border-radius: 999px;\n  padding: 6px 14px;\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;\n  font-size: 12px;\n  font-weight: 500;\n  letter-spacing: 0.2px;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);\n  z-index: 1000000;\n  pointer-events: none;\n  transition: opacity 0.3s ease;\n  white-space: nowrap;\n}\n\n#tod-xbox-hud.tod-xbox-hud-hidden {\n  opacity: 0;\n}\n";
(() => {
  // src/core/gamepad-nav.js
  var DEFAULT_SELECTOR = [
    'input:not([type="hidden"])',
    "button",
    "a[href]",
    '[role="button"]',
    '[tabindex]:not([tabindex="-1"])',
    ".live-channel-item",
    ".channel-card"
  ].join(", ");
  function isElementVisible(el, win) {
    if (!el || !el.isConnected) return false;
    const style = win.getComputedStyle ? win.getComputedStyle(el) : el.style;
    if (style && (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  function getCenter(el) {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      rect
    };
  }
  function createSpatialNavigator(options = {}) {
    const doc = options.document || document;
    const win = doc.defaultView || window;
    const selector = options.selector || DEFAULT_SELECTOR;
    const onAction = options.onAction || (() => {
    });
    const cooldownMs = options.cooldownMs ?? 180;
    const getCustomCandidates = options.getCandidates || null;
    let activeEl = null;
    let lastInputTime = -Infinity;
    let rafId = null;
    function collectCandidates() {
      const raw = getCustomCandidates ? getCustomCandidates(doc) : Array.from(doc.querySelectorAll(selector));
      const unique = Array.from(new Set(raw));
      return unique.filter((el) => isElementVisible(el, win));
    }
    function focusElement(el) {
      if (!el) return;
      if (doc.activeElement && doc.activeElement !== el && typeof doc.activeElement.blur === "function") {
        doc.activeElement.blur();
      }
      if (activeEl && activeEl !== el) {
        activeEl.classList.remove("tod-xbox-focus");
      }
      activeEl = el;
      activeEl.classList.add("tod-xbox-focus");
      if (typeof activeEl.scrollIntoView === "function") {
        try {
          activeEl.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        } catch {
        }
      }
    }
    function refresh() {
      const items = collectCandidates();
      if (activeEl && items.includes(activeEl)) {
        activeEl.classList.add("tod-xbox-focus");
        return items;
      }
      if (activeEl) {
        activeEl.classList.remove("tod-xbox-focus");
        activeEl = null;
      }
      if (items.length > 0) {
        focusElement(items[0]);
      }
      return items;
    }
    function move(direction) {
      const items = collectCandidates();
      if (items.length === 0) return null;
      if (!activeEl || !items.includes(activeEl)) {
        focusElement(items[0]);
        return activeEl;
      }
      const origin = getCenter(activeEl);
      let bestCandidate = null;
      let bestScore = Infinity;
      for (const candidate of items) {
        if (candidate === activeEl) continue;
        const target = getCenter(candidate);
        const dx = target.x - origin.x;
        const dy = target.y - origin.y;
        let primaryDelta = 0;
        let secondaryDelta = 0;
        if (direction === "right" && dx > 4) {
          primaryDelta = dx;
          secondaryDelta = Math.abs(dy);
        } else if (direction === "left" && dx < -4) {
          primaryDelta = -dx;
          secondaryDelta = Math.abs(dy);
        } else if (direction === "down" && dy > 4) {
          primaryDelta = dy;
          secondaryDelta = Math.abs(dx);
        } else if (direction === "up" && dy < -4) {
          primaryDelta = -dy;
          secondaryDelta = Math.abs(dx);
        } else {
          continue;
        }
        const score = primaryDelta + secondaryDelta * 2.5;
        if (score < bestScore) {
          bestScore = score;
          bestCandidate = candidate;
        }
      }
      if (bestCandidate) {
        focusElement(bestCandidate);
      }
      return activeEl;
    }
    function triggerAction(action) {
      onAction(action, activeEl);
    }
    function pollGamepad(customGamepads, now = performance.now()) {
      const pads = customGamepads || (win.navigator.getGamepads ? win.navigator.getGamepads() : []);
      const pad = Array.from(pads || []).find(Boolean);
      if (!pad) return;
      if (now - lastInputTime < cooldownMs) return;
      const btn = (i) => Boolean(pad.buttons && pad.buttons[i] && pad.buttons[i].pressed);
      const axisX = pad.axes && pad.axes[0] ? pad.axes[0] : 0;
      const axisY = pad.axes && pad.axes[1] ? pad.axes[1] : 0;
      if (btn(12) || axisY < -0.55) {
        lastInputTime = now;
        move("up");
      } else if (btn(13) || axisY > 0.55) {
        lastInputTime = now;
        move("down");
      } else if (btn(14) || axisX < -0.55) {
        lastInputTime = now;
        move("left");
      } else if (btn(15) || axisX > 0.55) {
        lastInputTime = now;
        move("right");
      } else if (btn(0)) {
        lastInputTime = now;
        triggerAction("A");
      } else if (btn(1)) {
        lastInputTime = now;
        triggerAction("B");
      } else if (btn(2)) {
        lastInputTime = now;
        triggerAction("X");
      } else if (btn(3)) {
        lastInputTime = now;
        triggerAction("Y");
      } else if (btn(4)) {
        lastInputTime = now;
        triggerAction("LB");
      } else if (btn(5)) {
        lastInputTime = now;
        triggerAction("RB");
      }
    }
    function onKeyDown(e) {
      const isTypingInInput = doc.activeElement && (doc.activeElement.tagName === "INPUT" || doc.activeElement.tagName === "TEXTAREA");
      if (e.key === "ArrowUp") {
        e.preventDefault();
        move("up");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        move("down");
      } else if (e.key === "ArrowLeft" && !isTypingInInput) {
        e.preventDefault();
        move("left");
      } else if (e.key === "ArrowRight" && !isTypingInInput) {
        e.preventDefault();
        move("right");
      } else if (e.key === "Enter") {
        e.preventDefault();
        triggerAction("A");
      } else if (e.key === "Escape" || e.key === "Backspace" && !isTypingInInput) {
        e.preventDefault();
        triggerAction("B");
      } else if ((e.key === "f" || e.key === "F") && !isTypingInInput) {
        e.preventDefault();
        triggerAction("X");
      } else if ((e.key === "c" || e.key === "C") && !isTypingInInput) {
        e.preventDefault();
        triggerAction("Y");
      } else if (e.key === "[" && !isTypingInInput) {
        e.preventDefault();
        triggerAction("LB");
      } else if (e.key === "]" && !isTypingInInput) {
        e.preventDefault();
        triggerAction("RB");
      }
    }
    win.addEventListener("keydown", onKeyDown);
    const observer = new win.MutationObserver(() => {
      refresh();
    });
    if (doc.body) {
      observer.observe(doc.body, { childList: true, subtree: true });
    }
    function startLoop() {
      if (typeof win.requestAnimationFrame !== "function") return;
      const step = (ts) => {
        pollGamepad(void 0, ts);
        rafId = win.requestAnimationFrame(step);
      };
      rafId = win.requestAnimationFrame(step);
    }
    if (options.autoLoop !== false) {
      startLoop();
    }
    function destroy() {
      win.removeEventListener("keydown", onKeyDown);
      observer.disconnect();
      if (rafId && typeof win.cancelAnimationFrame === "function") {
        win.cancelAnimationFrame(rafId);
      }
    }
    return {
      refresh,
      focusElement,
      getActiveElement: () => activeEl,
      move,
      triggerAction,
      pollGamepad,
      destroy
    };
  }

  // src/core/login-helper.js
  var LOGIN_BUTTON_PATTERNS = /giriş\s*yap|oturum\s*aç|devam\s*et|gönder|doğrula|login|sign\s*in/i;
  function isHierarchyVisible(el, doc) {
    const win = doc.defaultView || window;
    let curr = el;
    while (curr && curr.nodeType === 1) {
      if (curr.hidden || curr.getAttribute("aria-hidden") === "true" || curr.classList && (curr.classList.contains("hidden") || curr.classList.contains("hide-force") || curr.classList.contains("sr-only"))) {
        return false;
      }
      const style = win.getComputedStyle ? win.getComputedStyle(curr) : curr.style;
      if (style && (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")) {
        return false;
      }
      curr = curr.parentElement;
    }
    return true;
  }
  function isSearchInput(el) {
    const id = (el.id || "").toLowerCase();
    const formId = (el.getAttribute("data-form-id") || "").toLowerCase();
    const parentFormId = (el.form && el.form.id ? el.form.id : "").toLowerCase();
    return id.includes("search") || formId.includes("search") || parentFormId.includes("search") || el.type === "search";
  }
  function detectLoginState(doc = document) {
    const todLoginForm = doc.getElementById("bc-form-login");
    const scopeRoot = todLoginForm && isHierarchyVisible(todLoginForm, doc) ? todLoginForm : doc;
    const inputs = Array.from(
      scopeRoot.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type]), input[type="password"]'
      )
    ).filter(
      (el) => !el.disabled && el.type !== "hidden" && el.type !== "checkbox" && !isSearchInput(el) && isHierarchyVisible(el, doc)
    );
    const buttons = Array.from(
      scopeRoot.querySelectorAll('button, input[type="submit"], a[href], [role="button"]')
    ).filter((el) => {
      if (!isHierarchyVisible(el, doc)) return false;
      if (el.classList && el.classList.contains("toggle-password-view")) return false;
      const label = `${el.textContent || ""} ${el.value || ""} ${el.getAttribute("aria-label") || ""} ${el.id || ""}`.trim();
      return el.type === "submit" || el.id === "bc-btn-login-submit" || LOGIN_BUTTON_PATTERNS.test(label);
    });
    const hasPasswordOrInput = inputs.length > 0;
    const elements = [...inputs, ...buttons];
    return {
      isLoginVisible: hasPasswordOrInput,
      hasLoginTrigger: !hasPasswordOrInput && buttons.length > 0,
      elements
    };
  }
  function activateLoginElement(el) {
    if (!el) return "clicked";
    const tag = (el.tagName || "").toUpperCase();
    if (tag === "INPUT" && el.type !== "submit" && el.type !== "button") {
      el.focus();
      el.click();
      return "input-focused";
    }
    if (tag === "TEXTAREA") {
      el.focus();
      el.click();
      return "input-focused";
    }
    el.focus();
    el.click();
    if (el.form && typeof el.form.requestSubmit === "function" && el.type === "submit") {
      try {
        el.form.requestSubmit(el);
      } catch {
      }
      return "submitted";
    }
    return "clicked";
  }

  // src/core/live-player.js
  var QUICK_CHANNELS = [
    { id: "tod-ch-matches", label: "\u26BD Haftan\u0131n Ma\xE7lar\u0131", url: "https://www.todtv.com.tr/spor/haftanin-maclari" },
    { id: "tod-ch-bein1", label: "\u{1F534} beIN SPORTS 1", url: "https://www.todtv.com.tr/canli-tv/bein-sports-1?c=spor" },
    { id: "tod-ch-bein2", label: "\u{1F534} beIN SPORTS 2", url: "https://www.todtv.com.tr/canli-tv/bein-sports-2?c=spor" },
    { id: "tod-ch-bein3", label: "\u{1F534} beIN SPORTS 3", url: "https://www.todtv.com.tr/canli-tv/bein-sports-3?c=spor" },
    { id: "tod-ch-bein4", label: "\u{1F534} beIN SPORTS 4", url: "https://www.todtv.com.tr/canli-tv/bein-sports-4?c=spor" },
    { id: "tod-ch-beinmax1", label: "\u{1F534} beIN MAX 1", url: "https://www.todtv.com.tr/canli-tv/bein-sports-max-1?c=spor" },
    { id: "tod-ch-beinhaber", label: "\u{1F4FA} beIN HABER", url: "https://www.todtv.com.tr/canli-tv/bein-sports-haber?c=spor" }
  ];
  var CHANNEL_SELECTOR = [
    ".live-channel-item",
    ".channel-card",
    'a[href*="/canli-izle"]',
    'a[href*="/canli-tv/"]',
    'a[href*="/mac-detay/"]',
    "[data-channel-id]",
    ".tod-xbox-dock-item"
  ].join(", ");
  var PLAYER_CONTAINER_SELECTOR = [
    ".player-container",
    ".bitmovinplayer-container",
    ".shaka-video-container",
    '[class*="player-wrapper"]',
    '[id*="player"]'
  ].join(", ");
  function createLivePlayerController(doc = document) {
    function findVideo() {
      return doc.querySelector("video");
    }
    function findPlayerContainer() {
      const video = findVideo();
      if (video) {
        const closest = video.closest(PLAYER_CONTAINER_SELECTOR);
        if (closest) return closest;
        if (video.parentElement && video.parentElement !== doc.body) {
          return video.parentElement;
        }
        return video;
      }
      return doc.querySelector(PLAYER_CONTAINER_SELECTOR);
    }
    function ensureUnmutedPlaying() {
      const video = findVideo();
      if (!video) return;
      video.muted = false;
      video.removeAttribute("muted");
      if (typeof video.volume === "number") {
        video.volume = 1;
      }
      if (video.paused && typeof video.play === "function") {
        try {
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => {
          });
        } catch {
        }
      }
    }
    function isFullscreen() {
      const container = findPlayerContainer();
      const forced = Boolean(
        container && container.classList.contains("tod-xbox-forced-fullscreen") || doc.querySelector(".tod-xbox-forced-fullscreen")
      );
      return Boolean(doc.fullscreenElement || forced);
    }
    async function exitFullscreen() {
      const forcedEls = Array.from(doc.querySelectorAll(".tod-xbox-forced-fullscreen"));
      for (const el of forcedEls) {
        el.classList.remove("tod-xbox-forced-fullscreen");
      }
      if (doc.fullscreenElement && typeof doc.exitFullscreen === "function") {
        try {
          await doc.exitFullscreen();
        } catch {
        }
      }
      return false;
    }
    async function toggleFullscreen() {
      if (isFullscreen()) {
        return exitFullscreen();
      }
      const container = findPlayerContainer();
      if (!container) return false;
      ensureUnmutedPlaying();
      container.classList.add("tod-xbox-forced-fullscreen");
      if (typeof container.requestFullscreen === "function") {
        try {
          await container.requestFullscreen();
        } catch {
        }
      }
      return true;
    }
    function getChannelElements() {
      const win = doc.defaultView || window;
      return Array.from(doc.querySelectorAll(CHANNEL_SELECTOR)).filter((el) => {
        if (el.classList && el.classList.contains("tod-xbox-dock-item")) {
          const dock = el.closest("#tod-xbox-channel-dock");
          if (dock && !dock.classList.contains("tod-xbox-dock-open")) {
            return false;
          }
        }
        let curr = el;
        while (curr && curr.nodeType === 1) {
          if (curr.hidden || curr.getAttribute("aria-hidden") === "true" || curr.classList && curr.classList.contains("hidden")) {
            return false;
          }
          const style = win.getComputedStyle ? win.getComputedStyle(curr) : curr.style;
          if (style && (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")) {
            return false;
          }
          curr = curr.parentElement;
        }
        return true;
      });
    }
    function switchChannel(delta) {
      const channels = getChannelElements().filter((el) => !el.classList.contains("tod-xbox-dock-item"));
      if (channels.length === 0) return null;
      let currentIdx = channels.findIndex(
        (el) => el.classList.contains("active") || el.classList.contains("tod-xbox-focus") || el.getAttribute("aria-current") === "true"
      );
      if (currentIdx === -1) currentIdx = 0;
      const nextIdx = (currentIdx + delta + channels.length) % channels.length;
      for (const ch of channels) {
        ch.classList.remove("active");
      }
      const target = channels[nextIdx];
      target.classList.add("active");
      target.click();
      ensureUnmutedPlaying();
      return target;
    }
    return {
      toggleFullscreen,
      exitFullscreen,
      isFullscreen,
      switchChannel,
      getChannelElements,
      ensureUnmutedPlaying
    };
  }

  // src/index.js
  var HUD_TEXT = "[A] Se\xE7  [X/F] Tam Ekran  [Y/C] Kanallar  [LB/RB] Kanal De\u011Fi\u015Ftir";
  function initTodXboxLive(doc = document, injectedCss = "") {
    const win = doc.defaultView || window;
    if (win.__TOD_XBOX_LIVE_ACTIVE__) {
      return win.__TOD_XBOX_LIVE_ACTIVE__;
    }
    if (injectedCss && !doc.getElementById("tod-xbox-tv-styles")) {
      const styleEl = doc.createElement("style");
      styleEl.id = "tod-xbox-tv-styles";
      styleEl.textContent = injectedCss;
      (doc.head || doc.documentElement).appendChild(styleEl);
    }
    let dock = doc.getElementById("tod-xbox-channel-dock");
    if (!dock && doc.body) {
      dock = doc.createElement("nav");
      dock.id = "tod-xbox-channel-dock";
      for (const ch of QUICK_CHANNELS) {
        const link = doc.createElement("a");
        link.id = ch.id;
        link.className = "tod-xbox-dock-item";
        link.href = ch.url;
        link.textContent = ch.label;
        if (win.location && win.location.href && win.location.href.includes(ch.url.replace("https://www.todtv.com.tr", ""))) {
          link.classList.add("active");
        }
        dock.appendChild(link);
      }
      doc.body.appendChild(dock);
    }
    let hud = doc.getElementById("tod-xbox-hud");
    if (!hud && doc.body) {
      hud = doc.createElement("div");
      hud.id = "tod-xbox-hud";
      hud.textContent = HUD_TEXT;
      doc.body.appendChild(hud);
    }
    let hudTimer = null;
    const player = createLivePlayerController(doc);
    function pulseHud() {
      if (!hud) return;
      hud.classList.remove("tod-xbox-hud-hidden");
      if (hudTimer) clearTimeout(hudTimer);
      hudTimer = setTimeout(() => {
        if (hud) {
          hud.classList.add("tod-xbox-hud-hidden");
        }
      }, 3500);
    }
    const nav = createSpatialNavigator({
      document: doc,
      getCandidates(d) {
        if (dock && dock.classList.contains("tod-xbox-dock-open")) {
          return Array.from(dock.querySelectorAll(".tod-xbox-dock-item"));
        }
        const loginState = detectLoginState(d);
        const channels = player.getChannelElements();
        const others = Array.from(
          d.querySelectorAll('button, a[href], input:not([type="hidden"]), [role="button"]')
        ).filter((el) => !el.closest("#tod-xbox-channel-dock"));
        if (loginState.isLoginVisible && loginState.elements.length > 0) {
          return [...loginState.elements, ...channels, ...others];
        }
        return [...channels, ...others];
      },
      async onAction(action, activeEl) {
        pulseHud();
        if (action === "A") {
          if (!activeEl) return;
          const loginState = detectLoginState(doc);
          if (loginState.elements.includes(activeEl) || activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") {
            activateLoginElement(activeEl);
          } else {
            activeEl.click();
            setTimeout(() => player.ensureUnmutedPlaying(), 150);
          }
        } else if (action === "X") {
          await player.toggleFullscreen();
          pulseHud();
        } else if (action === "B") {
          if (dock && dock.classList.contains("tod-xbox-dock-open")) {
            dock.classList.remove("tod-xbox-dock-open");
            nav.refresh();
            return;
          }
          if (player.isFullscreen()) {
            await player.exitFullscreen();
            pulseHud();
          } else if (win.history && win.history.length > 1) {
            win.history.back();
          }
        } else if (action === "Y") {
          if (dock) {
            const isOpen = dock.classList.toggle("tod-xbox-dock-open");
            if (isOpen) {
              const firstItem = dock.querySelector(".tod-xbox-dock-item.active") || dock.querySelector(".tod-xbox-dock-item");
              if (firstItem) nav.focusElement(firstItem);
            } else {
              nav.refresh();
            }
          }
        } else if (action === "LB") {
          const target = player.switchChannel(-1);
          if (target) nav.focusElement(target);
        } else if (action === "RB") {
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
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const boot = () => {
      const css = typeof globalThis.__TOD_XBOX_INLINE_CSS__ === "string" ? globalThis.__TOD_XBOX_INLINE_CSS__ : "";
      initTodXboxLive(document, css);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
      boot();
    }
  }
})();
