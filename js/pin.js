// js/pin.js — PIN overlay UI

const overlayEl = document.getElementById('pin-overlay');
const panelEl   = document.getElementById('pin-panel');
const displayEl = document.getElementById('pin-display');
const messageEl = document.getElementById('pin-message');

let open = false;

export function isPinOpen() { return open; }

export function showPinOverlay() {
  overlayEl.classList.add('open');
  open = true;
}

export function hidePinOverlay() {
  overlayEl.classList.remove('open', 'error', 'success');
  panelEl.classList.remove('error', 'success');
  open = false;
}

export function setPinDisplay(value) {
  const slots = displayEl.querySelectorAll('.pin-slot');
  slots.forEach((slot, i) => {
    if (i < value.length) {
      slot.textContent = '•';
      slot.classList.add('filled');
    } else {
      slot.textContent = '_';
      slot.classList.remove('filled');
    }
  });
}

export function setPinMessage(text, kind = 'error') {
  messageEl.textContent = text;
  messageEl.className = kind;
}

export function clearPinMessage() {
  messageEl.textContent = '';
  messageEl.className = '';
}

export function triggerError() {
  panelEl.classList.add('error');
  setTimeout(() => panelEl.classList.remove('error'), 500);
}

export function triggerSuccess() {
  panelEl.classList.add('success');
  setTimeout(() => panelEl.classList.remove('success'), 1500);
}

export function setupPinUI(handlers) {
  const { onDigit, onClear, onSubmit } = handlers;

  overlayEl.querySelectorAll('.pin-key').forEach(btn => {
    btn.addEventListener('click', () => {
      const digit = btn.dataset.digit;
      const action = btn.dataset.action;
      if (digit !== undefined) onDigit(digit);
      else if (action === 'clear') onClear();
      else if (action === 'submit') onSubmit();
    });
  });
}
