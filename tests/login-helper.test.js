// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { detectLoginState, activateLoginElement, setupTodLoginCaptchaHandler } from '../src/core/login-helper.js';

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

  it('ignores login inputs inside a .hidden or display:none ancestor container', () => {
    document.body.innerHTML = `
      <div id="login-panel" class="hidden">
        <form id="login-form">
          <input id="username" type="text" />
          <input id="password" type="password" />
          <button id="submit-btn" type="submit">Giriş Yap</button>
        </form>
      </div>
    `;
    const state = detectLoginState(document);
    expect(state.isLoginVisible).toBe(false);
    expect(state.elements).toEqual([]);
  });

  it('targets real todtv.com.tr #bc-form-login fields and excludes header quick-search input (#bc-input-search)', () => {
    document.body.innerHTML = `
      <form id="bc-form-quick-search">
        <input type="text" id="bc-input-search" data-form-id="QuickSearchForm" />
        <button type="button" id="bc-btn-close-search">Kapat</button>
      </form>
      <main id="bc-page-login">
        <form action="/kullanici/giris" id="bc-form-login" method="post">
          <input class="bc-form-input" id="bc-input-username" name="User" type="text" />
          <input class="bc-form-input" id="bc-input-password" name="Password" type="password" />
          <button id="bc-btn-login-submit" type="submit">Giriş Yap</button>
        </form>
      </main>
    `;
    const state = detectLoginState(document);
    expect(state.isLoginVisible).toBe(true);
    expect(state.elements.map(e => e.id)).toEqual([
      'bc-input-username',
      'bc-input-password',
      'bc-btn-login-submit'
    ]);
  });

  it('intercepts #bc-form-login submit to execute TOD invisible reCAPTCHA (window.captchaManager) before posting', () => {
    document.body.innerHTML = `
      <form action="/kullanici/giris" id="bc-form-login" method="post">
        <input id="bc-input-username" name="User" type="text" value="5551112233" />
        <input id="bc-input-password" name="Password" type="password" value="secret12" />
        <button id="bc-btn-login-submit" type="submit">Devam Et</button>
      </form>
    `;
    const form = document.getElementById('bc-form-login');
    const submitSpy = vi.spyOn(form, 'submit').mockImplementation(() => {});

    let responseCallback = null;
    window.captchaManager = {
      EVENTS: { response: 'response' },
      getResponse: vi.fn(() => ''),
      on: vi.fn((evt, cb) => {
        if (evt === 'response') responseCallback = cb;
      }),
      off: vi.fn(),
      addOrUpdateResponseFormInputElement: vi.fn(f => {
        const input = document.createElement('input');
        input.id = 'captcha-response';
        input.name = 'g-recaptcha-response';
        input.type = 'hidden';
        input.value = 'test-recaptcha-token';
        f.appendChild(input);
      }),
      execute: vi.fn(() => {
        if (responseCallback) responseCallback('test-recaptcha-token');
      })
    };

    setupTodLoginCaptchaHandler(document);
    const submitBtn = document.getElementById('bc-btn-login-submit');
    activateLoginElement(submitBtn);

    expect(window.captchaManager.execute).toHaveBeenCalledTimes(1);
    expect(window.captchaManager.addOrUpdateResponseFormInputElement).toHaveBeenCalledWith(form);
    expect(form.querySelector('input[name="g-recaptcha-response"]')?.value).toBe('test-recaptcha-token');
    expect(submitSpy).toHaveBeenCalledTimes(1);

    delete window.captchaManager;
  });
});

