// js/main.js — entry point

import { setupGame, startGame } from './game.js';
import { resize } from './scene.js';
import { isMuted, setMuted } from './audio.js';

function syncMuteIcon() {
  const btn = document.getElementById('mute-toggle');
  const sound = document.getElementById('mute-icon-sound');
  const muted = document.getElementById('mute-icon-muted');
  if (!btn) return;
  if (isMuted()) {
    btn.classList.add('muted');
    sound.style.display = 'none';
    muted.style.display = 'block';
  } else {
    btn.classList.remove('muted');
    sound.style.display = 'block';
    muted.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupGame();
  document.querySelector('.start-btn').addEventListener('click', startGame);
  window.addEventListener('resize', resize);
  syncMuteIcon();
  const muteBtn = document.getElementById('mute-toggle');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      setMuted(!isMuted());
      syncMuteIcon();
    });
  }
});

document.addEventListener('keydown', e => {
  if (e.code === 'KeyM' && !e.repeat) {
    setMuted(!isMuted());
    syncMuteIcon();
  }
});
