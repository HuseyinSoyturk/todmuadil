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
});

