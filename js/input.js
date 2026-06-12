// js/input.js — keyboard, mouse, pointerlock handlers

const keys = {};

export function getKey(code) { return !!keys[code]; }

export function setupInput(handlers) {
  const {
    onKeyE, onMouseMove, onPointerLockChange, onOverlayClick,
    isPinOpen, onPinDigit, onPinClear, onPinSubmit, onPinClose
  } = handlers;

  document.addEventListener('keydown', e => {
    // PIN overlay: digits, backspace, enter, escape
    if (isPinOpen && isPinOpen()) {
      if (/^[0-9]$/.test(e.key)) { onPinDigit(e.key); e.preventDefault(); return; }
      if (e.key === 'Backspace') { onPinClear(); e.preventDefault(); return; }
      if (e.key === 'Enter')     { onPinSubmit(); e.preventDefault(); return; }
      if (e.key === 'Escape')    { onPinClose(); e.preventDefault(); return; }
      return;
    }
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
