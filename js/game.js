// js/game.js — global state, objectives, startGame, animate loop

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

const objectives = { sysadmin: false, devops: false, backup: false, sudo: false, list: false };

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

export function getState() { return state; }

export function checkObjective(key) {
  if (!objectives[key]) {
    objectives[key] = true;
    updateObjectives();
  }
}

function updateObjectives() {
  const map = {
    sysadmin: ['obj1', 'Crear usuario "sysadmin"'],
    devops:   ['obj2', 'Crear usuario "devops"'],
    backup:   ['obj3', 'Crear usuario "backup"'],
    sudo:     ['obj4', 'Agregar usuario a sudo'],
    list:     ['obj5', 'Ver lista de usuarios']
  };
  let allDone = true;
  for (const [k, [id]] of Object.entries(map)) {
    const icon = document.getElementById(id + '-icon');
    const text = document.getElementById(id + '-text');
    if (objectives[k]) {
      icon.textContent = '✓';
      icon.className = 'obj-check';
      text.style.textDecoration = 'line-through';
      text.style.color = '#3a5a45';
    } else {
      allDone = false;
    }
  }
  if (allDone) {
    setTimeout(() => {
      print('', 'output');
      print('╔══════════════════════════════════════╗', 'success');
      print('║  🎉  TODOS LOS OBJETIVOS COMPLETADOS  ║', 'success');
      print('║     ¡Servidor configurado con éxito!  ║', 'success');
      print('╚══════════════════════════════════════╝', 'success');
    }, 300);
  }
}

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
  if (!state.inside) return; // no terminal outside
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

  // Bounds: when outside, block at z=19 (just outside the door)
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
    // Outside: show door hint and PIN overlay when close
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

  // Inside: original cabinet hints
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
  const camera = getCamera();
  camera.position.set(0, CAMERA_HEIGHT, SPAWN_Z);
  camera.lookAt(0, CAMERA_HEIGHT, 0);
  buildScene().then(() => {
    animate();
    document.getElementById('canvas').requestPointerLock();
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
