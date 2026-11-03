const LOGIN_BUTTON_PATTERNS = /giriş\s*yap|oturum\s*aç|devam\s*et|gönder|doğrula|login|sign\s*in/i;

function isHierarchyVisible(el, doc) {
  const win = doc.defaultView || window;
  let curr = el;
  while (curr && curr.nodeType === 1) {
    if (
      curr.hidden ||
      curr.getAttribute('aria-hidden') === 'true' ||
      (curr.classList && curr.classList.contains('hidden'))
    ) {
      return false;
    }
    const style = win.getComputedStyle ? win.getComputedStyle(curr) : curr.style;
    if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
      return false;
    }
    curr = curr.parentElement;
  }
  return true;
}

export function detectLoginState(doc = document) {
  const inputs = Array.from(
    doc.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type]), input[type="password"]'
    )
  ).filter(el => !el.disabled && el.type !== 'hidden' && isHierarchyVisible(el, doc));

  const buttons = Array.from(
    doc.querySelectorAll('button, input[type="submit"], a[href], [role="button"]')
  ).filter(el => {
    if (!isHierarchyVisible(el, doc)) return false;
    const label = `${el.textContent || ''} ${el.value || ''} ${el.getAttribute('aria-label') || ''}`.trim();
    return el.type === 'submit' || LOGIN_BUTTON_PATTERNS.test(label);
  });

  const hasPasswordOrInput = inputs.length > 0;
  const elements = [...inputs, ...buttons];

  return {
    isLoginVisible: hasPasswordOrInput,
    hasLoginTrigger: !hasPasswordOrInput && buttons.length > 0,
    elements
  };
}

export function activateLoginElement(el) {
  if (!el) return 'clicked';
  const tag = (el.tagName || '').toUpperCase();

  if (tag === 'INPUT' && el.type !== 'submit' && el.type !== 'button') {
    el.focus();
    el.click();
    return 'input-focused';
  }

  if (tag === 'TEXTAREA') {
    el.focus();
    el.click();
    return 'input-focused';
  }

  el.focus();
  el.click();
  if (el.form && typeof el.form.requestSubmit === 'function' && el.type === 'submit') {
    try {
      el.form.requestSubmit(el);
    } catch {
      // click() already triggered default form submission in standard browsers
    }
    return 'submitted';
  }
  return 'clicked';
}
