// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLivePlayerController, QUICK_CHANNELS } from '../src/core/live-player.js';
import { initTodXboxLive } from '../src/index.js';

describe('createLivePlayerController', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="channel-list">
        <a id="bein1" class="live-channel-item active" href="/canli-izle/bein-sports-1">beIN SPORTS 1</a>
        <a id="bein2" class="live-channel-item" href="/canli-izle/bein-sports-2">beIN SPORTS 2</a>
      </div>
      <div id="player-wrapper" class="player-container">
        <video id="live-video" muted></video>
      </div>
    `;
    document.getElementById('live-video').play = vi.fn().mockResolvedValue();
    document.querySelectorAll('.live-channel-item').forEach(el => {
      el.addEventListener('click', e => e.preventDefault());
    });
  });

  it('activates forced 65-inch CSS fullscreen and unmutes video when requestFullscreen is unavailable or fails', async () => {
    const controller = createLivePlayerController(document);
    const video = document.getElementById('live-video');
    const wrapper = document.getElementById('player-wrapper');
    wrapper.requestFullscreen = vi.fn().mockRejectedValue(new Error('Blocked by WebView'));

    const isFs = await controller.toggleFullscreen();
    expect(isFs).toBe(true);
    expect(wrapper.classList.contains('tod-xbox-forced-fullscreen')).toBe(true);
    expect(video.muted).toBe(false);

    const afterExit = await controller.toggleFullscreen();
    expect(afterExit).toBe(false);
    expect(wrapper.classList.contains('tod-xbox-forced-fullscreen')).toBe(false);
  });

  it('switches to next and previous live channel on LB/RB', () => {
    const controller = createLivePlayerController(document);
    const bein2 = document.getElementById('bein2');
    const clickSpy = vi.spyOn(bein2, 'click');

    const next = controller.switchChannel(1);
    expect(next.id).toBe('bein2');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('excludes hidden channel elements when switching channels with LB/RB', () => {
    const hiddenCh = document.createElement('a');
    hiddenCh.id = 'bein-hidden';
    hiddenCh.className = 'live-channel-item hidden';
    hiddenCh.href = '/canli-izle/hidden';
    document.querySelector('.channel-list').insertBefore(hiddenCh, document.getElementById('bein2'));

    const controller = createLivePlayerController(document);
    expect(controller.getChannelElements().map(e => e.id)).toEqual(['bein1', 'bein2']);
    expect(controller.switchChannel(1).id).toBe('bein2');
  });

  it('provides real TOD sports channels in QUICK_CHANNELS and toggles sleek channel dock on Y action', () => {
    expect(QUICK_CHANNELS.some(c => c.url.includes('/canli-tv/bein-sports-1'))).toBe(true);
    expect(QUICK_CHANNELS.some(c => c.url.includes('/spor/haftanin-maclari'))).toBe(true);

    delete window.__TOD_XBOX_LIVE_ACTIVE__;
    const app = initTodXboxLive(document);
    const dock = document.getElementById('tod-xbox-channel-dock');
    expect(dock).toBeTruthy();
    expect(dock.classList.contains('tod-xbox-dock-open')).toBe(false);

    app.nav.triggerAction('Y');
    expect(dock.classList.contains('tod-xbox-dock-open')).toBe(true);
  });
});
