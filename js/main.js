// js/main.js — entry point

import { setupGame, startGame } from './game.js';
import { resize } from './scene.js';

document.addEventListener('DOMContentLoaded', () => {
  setupGame();
  document.querySelector('.start-btn').addEventListener('click', startGame);
  window.addEventListener('resize', resize);
});
