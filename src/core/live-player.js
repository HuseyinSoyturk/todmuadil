const CHANNEL_SELECTOR = [
  '.live-channel-item',
  '.channel-card',
  'a[href*="/canli-izle"]',
  'a[href*="/canli-tv"]',
  '[data-channel-id]'
].join(', ');

const PLAYER_CONTAINER_SELECTOR = [
  '.player-container',
  '.bitmovinplayer-container',
  '.shaka-video-container',
  '[class*="player-wrapper"]',
  '[id*="player"]'
].join(', ');

export function createLivePlayerController(doc = document) {
  function findVideo() {
    return doc.querySelector('video');
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
    video.removeAttribute('muted');
    if (typeof video.volume === 'number') {
      video.volume = 1;
    }
    if (video.paused && typeof video.play === 'function') {
      try {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        // Ignore play() autoplay errors in headless test environments
      }
    }
  }

  function isFullscreen() {
    const container = findPlayerContainer();
    const forced = Boolean(
      (container && container.classList.contains('tod-xbox-forced-fullscreen')) ||
      doc.querySelector('.tod-xbox-forced-fullscreen')
    );
    return Boolean(doc.fullscreenElement || forced);
  }

  async function exitFullscreen() {
    const forcedEls = Array.from(doc.querySelectorAll('.tod-xbox-forced-fullscreen'));
    for (const el of forcedEls) {
      el.classList.remove('tod-xbox-forced-fullscreen');
    }
    if (doc.fullscreenElement && typeof doc.exitFullscreen === 'function') {
      try {
        await doc.exitFullscreen();
      } catch {
        // Ignore exitFullscreen errors
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
    container.classList.add('tod-xbox-forced-fullscreen');

    if (typeof container.requestFullscreen === 'function') {
      try {
        await container.requestFullscreen();
      } catch {
        // Keep .tod-xbox-forced-fullscreen CSS fallback active
      }
    }
    return true;
  }

  function getChannelElements() {
    const win = doc.defaultView || window;
    return Array.from(doc.querySelectorAll(CHANNEL_SELECTOR)).filter(el => {
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
    });
  }

  function switchChannel(delta) {
    const channels = getChannelElements();
    if (channels.length === 0) return null;

    let currentIdx = channels.findIndex(
      el => el.classList.contains('active') || el.classList.contains('tod-xbox-focus') || el.getAttribute('aria-current') === 'true'
    );
    if (currentIdx === -1) currentIdx = 0;

    const nextIdx = (currentIdx + delta + channels.length) % channels.length;
    for (const ch of channels) {
      ch.classList.remove('active');
    }
    const target = channels[nextIdx];
    target.classList.add('active');
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

