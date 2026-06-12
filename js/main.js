// js/main.js — entry point

import { setupGame, startGame } from './game.js';
// Note: `resize` is added as an export of scene.js in Task 10
import { resize } from './scene.js';

document.addEventListener('DOMContentLoaded', () => {
  setupGame();
  document.querySelector('.start-btn').addEventListener('click', startGame);
  window.addEventListener('resize', resize);
});
