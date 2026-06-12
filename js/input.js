// js/input.js — keyboard, mouse, pointerlock handlers

const keys = {};

export function getKey(code) { return !!keys[code]; }

export function setupInput(handlers) {
  const { onKeyE, onMouseMove, onPointerLockChange, onOverlayClick } = handlers;

  document.addEventListener('keydown', e => {
    if (handlers.isTerminalOpen && handlers.isTerminalOpen()) return;
    keys[e.code] = true;
    if (e.code === 'KeyE') onKeyE();
    if (e.code === 'Escape' && document.pointerLockElement) document.exitPointerLock();
  });

  document.addEventListener('keyup', e => { keys[e.code] = false; });

  document.addEventListener('mousemove', e => {
    if (!document.pointerLockElement || (handlers.isTerminalOpen && handlers.isTerminalOpen())) return;
    onMouseMove(e.movementX, e.movementY);
  });

  document.addEventListener('pointerlockchange', () => {
    onPointerLockChange(document.pointerLockElement === document.getElementById('canvas'));
  });

  document.getElementById('canvas').addEventListener('click', () => {
    if (handlers.isStarted && handlers.isStarted() && !(handlers.isTerminalOpen && handlers.isTerminalOpen())) {
      document.getElementById('canvas').requestPointerLock();
    }
  });

  document.getElementById('overlay').addEventListener('click', () => {
    if (onOverlayClick) onOverlayClick();
  });
}
