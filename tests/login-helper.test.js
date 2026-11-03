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

