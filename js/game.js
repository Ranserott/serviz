// js/game.js — global state, objectives, startGame, animate loop

import { buildScene, getNearestServer, getCamera, getCabinetMeshes } from './scene.js';
import { print, printPrompt, openTerminal as openTerminalUI, closeTerminal as closeTerminalUI, setupTerminalInput } from './terminal.js';
import { processCommand } from './commands.js';
import { getKey, setupInput } from './input.js';

const state = {
  gameStarted: false,
  terminalOpen: false,
  currentServer: null,
  isLocked: false,
  yaw: 0,
  pitch: 0
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
  camera.position.x = Math.max(-BOUNDS, Math.min(BOUNDS, camera.position.x));
  camera.position.z = Math.max(-BOUNDS, Math.min(BOUNDS, camera.position.z));
  camera.position.y = CAMERA_HEIGHT;
}

function updateInteractionHints() {
  const nearest = getNearestServer();
  const hint  = document.getElementById('interact-hint');
  const label = document.getElementById('server-label');
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
  // Note: renderer.render(scene, camera) is added in Task 10
}

export function startGame() {
  document.getElementById('click-to-start').style.display = 'none';
  state.gameStarted = true;
  buildScene();
  animate();
  document.getElementById('canvas').requestPointerLock();
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
  setupInput({
    isTerminalOpen: () => state.terminalOpen,
    isStarted: () => state.gameStarted,
    onKeyE,
    onMouseMove,
    onPointerLockChange,
    onOverlayClick: closeTerminalFor
  });
}
