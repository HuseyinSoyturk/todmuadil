const DEFAULT_SELECTOR = [
  'input:not([type="hidden"])',
  'button',
  'a[href]',
  '[role="button"]',
  '[tabindex]:not([tabindex="-1"])',
  '.live-channel-item',
  '.channel-card'
].join(', ');

function isElementVisible(el, win) {
  if (!el || !el.isConnected) return false;
  const style = win.getComputedStyle ? win.getComputedStyle(el) : el.style;
  if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
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

export function createSpatialNavigator(options = {}) {
  const doc = options.document || document;
  const win = doc.defaultView || window;
  const selector = options.selector || DEFAULT_SELECTOR;
  const onAction = options.onAction || (() => {});
  const cooldownMs = options.cooldownMs ?? 180;
  const getCustomCandidates = options.getCandidates || null;

  let activeEl = null;
  let lastInputTime = -Infinity;
  let rafId = null;

  function collectCandidates() {
    const raw = getCustomCandidates
      ? getCustomCandidates(doc)
      : Array.from(doc.querySelectorAll(selector));
    const unique = Array.from(new Set(raw));
    return unique.filter(el => isElementVisible(el, win));
  }

  function focusElement(el) {
    if (!el) return;
    if (doc.activeElement && doc.activeElement !== el && typeof doc.activeElement.blur === 'function') {
      doc.activeElement.blur();
    }
    if (activeEl && activeEl !== el) {
      activeEl.classList.remove('tod-xbox-focus');
    }
    activeEl = el;
    activeEl.classList.add('tod-xbox-focus');
    if (typeof activeEl.scrollIntoView === 'function') {
      try {
        activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      } catch {
        // Ignore in environments without scrollIntoView options support
      }
    }
  }

  function refresh() {
    const items = collectCandidates();
    if (activeEl && items.includes(activeEl)) {
      activeEl.classList.add('tod-xbox-focus');
      return items;
    }
    if (activeEl) {
      activeEl.classList.remove('tod-xbox-focus');
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

      if (direction === 'right' && dx > 4) {
        primaryDelta = dx;
        secondaryDelta = Math.abs(dy);
      } else if (direction === 'left' && dx < -4) {
        primaryDelta = -dx;
        secondaryDelta = Math.abs(dy);
      } else if (direction === 'down' && dy > 4) {
        primaryDelta = dy;
        secondaryDelta = Math.abs(dx);
      } else if (direction === 'up' && dy < -4) {
        primaryDelta = -dy;
        secondaryDelta = Math.abs(dx);
      } else {
        continue;
      }

      // Weight orthogonal distance heavier so aligned rows/columns win naturally
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

    const btn = i => Boolean(pad.buttons && pad.buttons[i] && pad.buttons[i].pressed);
    const axisX = pad.axes && pad.axes[0] ? pad.axes[0] : 0;
    const axisY = pad.axes && pad.axes[1] ? pad.axes[1] : 0;

    if (btn(12) || axisY < -0.55) {
      lastInputTime = now;
      move('up');
    } else if (btn(13) || axisY > 0.55) {
      lastInputTime = now;
      move('down');
    } else if (btn(14) || axisX < -0.55) {
      lastInputTime = now;
      move('left');
    } else if (btn(15) || axisX > 0.55) {
      lastInputTime = now;
      move('right');
    } else if (btn(0)) {
      lastInputTime = now;
      triggerAction('A');
    } else if (btn(1)) {
      lastInputTime = now;
      triggerAction('B');
    } else if (btn(2)) {
      lastInputTime = now;
      triggerAction('X');
    } else if (btn(3)) {
      lastInputTime = now;
      triggerAction('Y');
    } else if (btn(4)) {
      lastInputTime = now;
      triggerAction('LB');
    } else if (btn(5)) {
      lastInputTime = now;
      triggerAction('RB');
    }
  }

  function onKeyDown(e) {
    const isTypingInInput =
      doc.activeElement &&
      (doc.activeElement.tagName === 'INPUT' || doc.activeElement.tagName === 'TEXTAREA');

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      move('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      move('down');
    } else if (e.key === 'ArrowLeft' && !isTypingInInput) {
      e.preventDefault();
      move('left');
    } else if (e.key === 'ArrowRight' && !isTypingInInput) {
      e.preventDefault();
      move('right');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      triggerAction('A');
    } else if (e.key === 'Escape' || (e.key === 'Backspace' && !isTypingInInput)) {
      e.preventDefault();
      triggerAction('B');
    } else if ((e.key === 'f' || e.key === 'F') && !isTypingInInput) {
      e.preventDefault();
      triggerAction('X');
    } else if ((e.key === 'c' || e.key === 'C') && !isTypingInInput) {
      e.preventDefault();
      triggerAction('Y');
    } else if (e.key === '[' && !isTypingInInput) {
      e.preventDefault();
      triggerAction('LB');
    } else if (e.key === ']' && !isTypingInInput) {
      e.preventDefault();
      triggerAction('RB');
    }
  }

  win.addEventListener('keydown', onKeyDown);

  const observer = new win.MutationObserver(() => {
    refresh();
  });
  if (doc.body) {
    observer.observe(doc.body, { childList: true, subtree: true });
  }

  function startLoop() {
    if (typeof win.requestAnimationFrame !== 'function') return;
    const step = ts => {
      pollGamepad(undefined, ts);
      rafId = win.requestAnimationFrame(step);
    };
    rafId = win.requestAnimationFrame(step);
  }

  if (options.autoLoop !== false) {
    startLoop();
  }

  function destroy() {
    win.removeEventListener('keydown', onKeyDown);
    observer.disconnect();
    if (rafId && typeof win.cancelAnimationFrame === 'function') {
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
