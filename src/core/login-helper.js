const LOGIN_BUTTON_PATTERNS = /giriş\s*yap|oturum\s*aç|devam\s*et|gönder|doğrula|login|sign\s*in/i;

function isHierarchyVisible(el, doc) {
  const win = doc.defaultView || window;
  let curr = el;
  while (curr && curr.nodeType === 1) {
    if (
      curr.hidden ||
      curr.getAttribute('aria-hidden') === 'true' ||
      (curr.classList && (curr.classList.contains('hidden') || curr.classList.contains('hide-force') || curr.classList.contains('sr-only')))
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

function isSearchInput(el) {
  const id = (el.id || '').toLowerCase();
  const formId = (el.getAttribute('data-form-id') || '').toLowerCase();
  const parentFormId = (el.form && el.form.id ? el.form.id : '').toLowerCase();
  return (
    id.includes('search') ||
    formId.includes('search') ||
    parentFormId.includes('search') ||
    el.type === 'search'
  );
}

export function setupTodLoginCaptchaHandler(doc = document) {
  const loginForm = doc.getElementById('bc-form-login');
  if (!loginForm || loginForm.getAttribute('data-tod-xbox-captcha') === '1') return;
  loginForm.setAttribute('data-tod-xbox-captcha', '1');

  loginForm.addEventListener('submit', function (e) {
    const win = doc.defaultView || window;
    const cm = win.captchaManager;
    if (!cm || typeof cm.execute !== 'function') return;

    const existingToken = typeof cm.getResponse === 'function' ? cm.getResponse() : '';
    if (existingToken) {
      if (typeof cm.addOrUpdateResponseFormInputElement === 'function') {
        cm.addOrUpdateResponseFormInputElement(loginForm);
      }
      return;
    }

    e.preventDefault();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }

    if (typeof cm.initialize === 'function' && win.grecaptcha && typeof win.grecaptcha.render === 'function') {
      try {
        cm.initialize();
      } catch (err) {
        // Ignore if already initialized
      }
    }

    const onResponse = function () {
      if (typeof cm.off === 'function' && cm.EVENTS) {
        cm.off(cm.EVENTS.response, onResponse);
      }
      if (typeof cm.addOrUpdateResponseFormInputElement === 'function') {
        cm.addOrUpdateResponseFormInputElement(loginForm);
      }
      loginForm.submit();
    };

    if (typeof cm.on === 'function' && cm.EVENTS) {
      cm.on(cm.EVENTS.response, onResponse);
    }

    try {
      cm.execute();
    } catch (err) {
      loginForm.submit();
    }
  });
}

export function detectLoginState(doc = document) {
  setupTodLoginCaptchaHandler(doc);

  // Prioritize real todtv.com.tr #bc-form-login if present
  const todLoginForm = doc.getElementById('bc-form-login');
  const scopeRoot = todLoginForm && isHierarchyVisible(todLoginForm, doc) ? todLoginForm : doc;

  const inputs = Array.from(
    scopeRoot.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type]), input[type="password"]'
    )
  ).filter(
    el =>
      !el.disabled &&
      el.type !== 'hidden' &&
      el.type !== 'checkbox' &&
      !isSearchInput(el) &&
      isHierarchyVisible(el, doc)
  );

  const buttons = Array.from(
    scopeRoot.querySelectorAll('button, input[type="submit"], a[href], [role="button"]')
  ).filter(el => {
    if (!isHierarchyVisible(el, doc)) return false;
    if (el.classList && el.classList.contains('toggle-password-view')) return false;
    const label = `${el.textContent || ''} ${el.value || ''} ${el.getAttribute('aria-label') || ''} ${el.id || ''}`.trim();
    return el.type === 'submit' || el.id === 'bc-btn-login-submit' || LOGIN_BUTTON_PATTERNS.test(label);
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

  const form = el.form;
  if (form && el.ownerDocument) {
    setupTodLoginCaptchaHandler(el.ownerDocument);
  }

  let submitFired = false;
  const onFormSubmit = function () {
    submitFired = true;
  };
  if (form) {
    form.addEventListener('submit', onFormSubmit, true);
  }

  el.focus();
  el.click();

  if (form) {
    form.removeEventListener('submit', onFormSubmit, true);
  }

  if (form && !submitFired && el.type === 'submit') {
    if (typeof form.requestSubmit === 'function') {
      try {
        form.requestSubmit(el);
        return 'submitted';
      } catch (err) {
        // Fallback below
      }
    }
    const doc = el.ownerDocument || document;
    const evt = doc.createEvent('Event');
    evt.initEvent('submit', true, true);
    if (form.dispatchEvent(evt)) {
      form.submit();
    }
    return 'submitted';
  }

  return submitFired ? 'submitted' : 'clicked';
}
