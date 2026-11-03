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

  it('preserves currently focused element across dynamic DOM refreshes', () => {
    const nav = createSpatialNavigator({ selector: '.channel-card' });
    nav.refresh();
    nav.move('right');
    expect(nav.getActiveElement().id).toBe('ch2');

    const ch4 = document.createElement('button');
    ch4.id = 'ch4';
    ch4.className = 'channel-card';
    mockRect(ch4, 300, 260);
    document.getElementById('grid').appendChild(ch4);

    nav.refresh();
    expect(nav.getActiveElement().id).toBe('ch2');
  });

  it('blurs an active input element when D-Pad moves focus to another element', () => {
    const input = document.createElement('input');
    input.id = 'search-input';
    input.className = 'channel-card';
    mockRect(input, 50, 20);
    document.getElementById('grid').prepend(input);

    const nav = createSpatialNavigator({ selector: '.channel-card' });
    nav.refresh();
    input.focus();
    expect(document.activeElement).toBe(input);

    nav.move('down');
    expect(nav.getActiveElement().id).toBe('ch1');
    expect(document.activeElement).not.toBe(input);
  });
});

