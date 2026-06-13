// js/terminal.js — UI terminal: print, open, close, escapeHtml

import { playTyping, playTerminalOpen, playTerminalClose } from './audio.js';

const terminalBody = document.getElementById('terminal-body');
const terminalInput = document.getElementById('terminal-input');
const terminalEl = document.getElementById('terminal');
const overlayEl = document.getElementById('overlay');
const titleEl = document.getElementById('terminal-title');
const promptLabelEl = document.getElementById('terminal-prompt-label');

export function print(text, cls = 'output') {
  const line = document.createElement('div');
  line.className = `t-line t-${cls}`;
  line.textContent = text;
  terminalBody.appendChild(line);
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

export function printPrompt(cmd) {
  const line = document.createElement('div');
  line.className = 't-line';
  line.innerHTML = `<span class="t-prompt">root@server-01:~$</span> ${escapeHtml(cmd)}`;
  terminalBody.appendChild(line);
}

export function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function openTerminal(server) {
  terminalEl.style.display = 'flex';
  overlayEl.style.display = 'block';
  titleEl.textContent = `Terminal — ${server.userData.serverId} (${server.userData.serverName}) — bash`;
  promptLabelEl.textContent = `root@${server.userData.serverId}:~$`;
  terminalBody.innerHTML = '';
  print(`Bienvenido al servidor ${server.userData.serverName}`, 'success');
  print(`Sistema: Ubuntu 22.04.3 LTS | Kernel: 5.15.0-91-generic`, 'info');
  print(`Última conexión: Tue Dec 12 10:34:22 2024`, 'info');
  print(`Escribe 'help' para ver comandos disponibles.`, 'output');
  print('', 'output');
  if (document.pointerLockElement) document.exitPointerLock();
  terminalInput.focus();
  playTerminalOpen();
}

export function closeTerminal() {
  playTerminalClose();
  terminalEl.style.display = 'none';
  overlayEl.style.display = 'none';
  terminalInput.value = '';
}

export function setupTerminalInput(onSubmit) {
  terminalInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const cmd = terminalInput.value; terminalInput.value = '';
      onSubmit(cmd);
      return;
    }
    playTyping();
  });
}
