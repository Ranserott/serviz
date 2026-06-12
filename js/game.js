// js/game.js — global state, multi-level objectives, startGame, animate loop

import './three-bootstrap.js';
import { buildScene, getNearestServer, getCamera, getCabinetMeshes, renderFrame, getDoor } from './scene.js';
import { print, printPrompt, openTerminal as openTerminalUI, closeTerminal as closeTerminalUI, setupTerminalInput } from './terminal.js';
import { processCommand } from './commands.js';
import { getKey, setupInput } from './input.js';
import {
  isPinOpen, showPinOverlay, hidePinOverlay, setPinDisplay, setPinMessage,
  clearPinMessage, triggerError, triggerSuccess, setupPinUI
} from './pin.js';

const state = {
  gameStarted: false,
  terminalOpen: false,
  currentServer: null,
  isLocked: false,
  yaw: 0,
  pitch: 0,
  inside: false,
  pinInput: ''
};

const clock = new THREE.Clock();
const moveDir = new THREE.Vector3();

const INTERACT_DISTANCE = 3.5;
const MAX_DELTA = 0.05;
const MOVE_SPEED = 5;
const BOUNDS = 18;
const CAMERA_HEIGHT = 1.7;
const PITCH_LIMIT = Math.PI / 3;
const MOUSE_SENSITIVITY = 0.002;
const PIN_CODE = '1234';
const PIN_LENGTH = 4;
const DOOR_Z = 18;
const SPAWN_Z = 22;

// ==================== MULTI-LEVEL OBJECTIVES SYSTEM ====================

const LEVELS = [
  {
    id: 1,
    name: 'Administración Básica',
    objectives: [
      { key: 'sysadmin', server: 'server-01', serverName: 'Web', text: 'Crear usuario "sysadmin"', command: 'useradd sysadmin' },
      { key: 'devops',  server: 'server-02', serverName: 'DB',  text: 'Crear usuario "devops" y agregarlo a sudo', command: 'usermod -aG sudo devops' },
      { key: 'backup',   server: 'server-03', serverName: 'App', text: 'Crear usuario "backup" y agregarlo a sudo', command: 'usermod -aG sudo backup' },
      { key: 'list',     server: 'server-04', serverName: 'Backup', text: 'Listar usuarios con cat /etc/passwd', command: 'cat /etc/passwd' }
    ]
  },
  {
    id: 2,
    name: 'Gestión de Usuarios',
    objectives: [
      { key: 'homedir',  server: 'server-01', serverName: 'Web', text: 'Crear usuario con home: useradd -m alumno', command: 'useradd -m alumno' },
      { key: 'delete',   server: 'server-02', serverName: 'DB',  text: 'Eliminar usuario "test" (si existe)', command: 'userdel test' },
      { key: 'groups',   server: 'server-03', serverName: 'App', text: 'Ver grupos del usuario "devops"', command: 'groups devops' },
      { key: 'usermod',  server: 'server-04', serverName: 'Backup', text: 'Agregar "alumno" al grupo "developers"', command: 'usermod -aG developers alumno' }
    ]
  },
  {
    id: 3,
    name: 'Administración Avanzada',
    objectives: [
      { key: 'passwd',   server: 'server-01', serverName: 'Web', text: 'Cambiar contraseña de "sysadmin"', command: 'passwd sysadmin' },
      { key: 'userid',   server: 'server-02', serverName: 'DB',  text: 'Ver UID del usuario "backup"', command: 'id backup' },
      { key: 'uname',    server: 'server-03', serverName: 'App', text: 'Ver info del sistema con uname -a', command: 'uname -a' },
      { key: 'who',      server: 'server-04', serverName: 'Backup', text: 'Ver usuarios conectados con who', command: 'who' }
    ]
  }
];

let currentLevelIndex = 0;
let completedObjectives = {}; // { levelId: { key: true } }

function getCurrentLevel() {
  return LEVELS[currentLevelIndex];
}

function getLevelProgress() {
  const level = getCurrentLevel();
  const completed = completedObjectives[level.id] || {};
  const done = level.objectives.filter(o => completed[o.key]).length;
  return { done, total: level.objectives.length };
}

function checkObjective(key) {
  const level = getCurrentLevel();
  if (!completedObjectives[level.id]) completedObjectives[level.id] = {};
  
  if (!completedObjectives[level.id][key]) {
    completedObjectives[level.id][key] = true;
    updateObjectivesUI();
    
    const { done, total } = getLevelProgress();
    if (done === total) {
      onLevelComplete();
    }
  }
}

function onLevelComplete() {
  const level = getCurrentLevel();
  setTimeout(() => {
    print('', 'output');
    print('╔══════════════════════════════════════════╗', 'success');
    print(`║  🎉  NIVEL ${level.id} COMPLETADO: ${level.name}  ║`, 'success');
    print('║     ¡Pasando al siguiente nivel...      ║', 'success');
    print('╚══════════════════════════════════════════╝', 'success');
  }, 300);
  
  // Advance to next level after delay
  setTimeout(() => {
    if (currentLevelIndex < LEVELS.length - 1) {
      currentLevelIndex++;
      updateObjectivesUI();
      print('', 'output');
      print(`═══ NIVEL ${getCurrentLevel().id}: ${getCurrentLevel().name.toUpperCase()} ═══`, 'info');
      print('Nuevas misiones disponibles en los servidores', 'info');
    } else {
      print('', 'output');
      print('╔══════════════════════════════════════════╗', 'success');
      print('║  🏆  TODOS LOS NIVELES COMPLETADOS  🏆  ║', 'success');
      print('║   ¡Eres un Administrador de Sistemas!  ║', 'success');
      print('╚══════════════════════════════════════════╝', 'success');
    }
  }, 2500);
}

function updateObjectivesUI() {
  const level = getCurrentLevel();
  const { done, total } = getLevelProgress();
  
  // Update level header
  document.getElementById('level-badge').textContent = `NIVEL ${level.id}`;
  document.getElementById('level-name').textContent = level.name;
  document.getElementById('level-progress-text').textContent = `${done}/${total} completados`;
  
  // Update objectives list
  const list = document.getElementById('objectives-list');
  list.innerHTML = '';
  
  level.objectives.forEach((obj, i) => {
    const completed = completedObjectives[level.id]?.[obj.key];
    const div = document.createElement('div');
    div.className = 'obj-item';
    div.innerHTML = `
      <span class="obj-${completed ? 'check' : 'pending'}">${completed ? '✓' : '□'}</span>
      <span class="obj-text" style="${completed ? 'text-decoration:line-through;color:#3a5a45' : ''}">
        <b>${obj.server}</b> (${obj.serverName}): ${obj.text}
      </span>
    `;
    list.appendChild(div);
  });
}

export function getState() { return state; }
export function getCurrentLevelInfo() { return getCurrentLevel(); }
export function checkObjective(key) { checkObjective(key); }

// ==================== GAME LOGIC ====================

function openTerminalFor(server) {
  state.terminalOpen = true;
  state.currentServer = server;
  openTerminalUI(server);
}

function closeTerminalFor() {
  state.terminalOpen = false;
  state.currentServer = null;
  closeTerminalUI();
  if (state.gameStarted) document.getElementById('canvas').requestPointerLock();
}

function onKeyE() {
  if (!state.inside) return;
  const nearest = getNearestServer();
  if (nearest && nearest.dist < INTERACT_DISTANCE) openTerminalFor(nearest.mesh);
}

function onMouseMove(movementX, movementY) {
  state.yaw   -= movementX * MOUSE_SENSITIVITY;
  state.pitch -= movementY * MOUSE_SENSITIVITY;
  state.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, state.pitch));
}

function onPointerLockChange(locked) {
  state.isLocked = locked;
}

function openDoor() {
  const door = getDoor();
  if (!door) return;
  door.userData.open = true;
  door.position.x = door.userData.openX;
  door.material.color.setHex(door.userData.openColor);
}

function tryEnterPin(input) {
  if (input === PIN_CODE) {
    state.inside = true;
    openDoor();
    triggerSuccess();
    setPinMessage('✓ PUERTA ABIERTA', 'success');
    setTimeout(() => hidePinOverlay(), 1200);
  } else {
    triggerError();
    setPinMessage('PIN incorrecto', 'error');
    setTimeout(() => {
      state.pinInput = '';
      setPinDisplay('');
      clearPinMessage();
    }, 600);
  }
}

function addPinDigit(digit) {
  if (state.pinInput.length >= PIN_LENGTH) return;
  state.pinInput += digit;
  setPinDisplay(state.pinInput);
  if (state.pinInput.length === PIN_LENGTH) {
    setTimeout(() => tryEnterPin(state.pinInput), 200);
  }
}

function clearPinInput() {
  state.pinInput = '';
  setPinDisplay('');
  clearPinMessage();
}

function submitPin() {
  if (state.pinInput.length === PIN_LENGTH) tryEnterPin(state.pinInput);
}

function closePin() {
  state.pinInput = '';
  setPinDisplay('');
  clearPinMessage();
  hidePinOverlay();
}

function updateMovement(dt) {
  if (state.terminalOpen || !state.isLocked) return;
  const camera = getCamera();
  const euler = new THREE.Euler(state.pitch, state.yaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
  const forward = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  const right   = new THREE.Vector3( Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  moveDir.set(0, 0, 0);
  if (getKey('KeyW') || getKey('ArrowUp'))    moveDir.addScaledVector(forward,  MOVE_SPEED * dt);
  if (getKey('KeyS') || getKey('ArrowDown'))  moveDir.addScaledVector(forward, -MOVE_SPEED * dt);
  if (getKey('KeyA') || getKey('ArrowLeft'))  moveDir.addScaledVector(right,   -MOVE_SPEED * dt);
  if (getKey('KeyD') || getKey('ArrowRight')) moveDir.addScaledVector(right,    MOVE_SPEED * dt);
  camera.position.add(moveDir);

  if (!state.inside) {
    camera.position.x = Math.max(-BOUNDS, Math.min(BOUNDS, camera.position.x));
    camera.position.z = Math.max(19, Math.min(SPAWN_Z + 1, camera.position.z));
  } else {
    camera.position.x = Math.max(-BOUNDS, Math.min(BOUNDS, camera.position.x));
    camera.position.z = Math.max(-BOUNDS, Math.min(BOUNDS, camera.position.z));
  }
  camera.position.y = CAMERA_HEIGHT;
}

function updateInteractionHints() {
  const hint  = document.getElementById('interact-hint');
  const label = document.getElementById('server-label');

  if (!state.inside) {
    const door = getDoor();
    if (door) {
      const dx = getCamera().position.x - door.position.x;
      const dz = getCamera().position.z - door.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 3 && !isPinOpen()) {
        showPinOverlay();
      }
    }
    hint.style.display = 'none';
    label.style.display = 'none';
    return;
  }

  const nearest = getNearestServer();
  if (nearest && nearest.dist < INTERACT_DISTANCE && !state.terminalOpen) {
    hint.style.display  = 'block';
    hint.textContent    = `Presiona [E] para acceder a: ${nearest.mesh.userData.serverName}`;
    label.style.display = 'block';
    label.textContent   = nearest.mesh.userData.serverId;
  } else {
    hint.style.display  = 'none';
    label.style.display = 'none';
  }
}

function updateLedFlicker() {
  const t = clock.getElapsedTime();
  getCabinetMeshes().forEach((m, i) => {
    if (m.userData.glowLight) m.userData.glowLight.intensity = 0.4 + 0.2 * Math.sin(t * 2 + i);
  });
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), MAX_DELTA);
  updateMovement(dt);
  updateInteractionHints();
  updateLedFlicker();
  renderFrame();
}

export function startGame() {
  document.getElementById('click-to-start').style.display = 'none';
  state.gameStarted = true;
  state.inside = false;
  state.pinInput = '';
  currentLevelIndex = 0;
  completedObjectives = {};
  
  const camera = getCamera();
  camera.position.set(0, CAMERA_HEIGHT, SPAWN_Z);
  camera.lookAt(0, CAMERA_HEIGHT, 0);
  
  buildScene().then(() => {
    updateObjectivesUI();
    animate();
    document.getElementById('canvas').requestPointerLock();
    print('', 'output');
    print('═══ BIENVENIDO AL SERVER CONFIG SIMULATOR ═══', 'info');
    print(`Nivel 1: ${getCurrentLevel().name}`, 'info');
    print('Completa las misiones en cada servidor', 'info');
    print('', 'output');
  });
}

export function setupGame() {
  setupTerminalInput(rawCmd => {
    processCommand(rawCmd, {
      print,
      printPrompt,
      checkObjective,
      closeTerminal: closeTerminalFor
    });
  });
  setupPinUI({
    onDigit: addPinDigit,
    onClear: clearPinInput,
    onSubmit: submitPin
  });
  setupInput({
    isTerminalOpen: () => state.terminalOpen,
    isStarted: () => state.gameStarted,
    isPinOpen,
    onKeyE,
    onMouseMove,
    onPointerLockChange,
    onOverlayClick: closeTerminalFor,
    onPinDigit: addPinDigit,
    onPinClear: clearPinInput,
    onPinSubmit: submitPin,
    onPinClose: closePin
  });
}
