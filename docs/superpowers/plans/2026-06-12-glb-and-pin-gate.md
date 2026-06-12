# Server Simulator — Plan: GLB Modelos y PIN Gate

> **For agentic workers:** REQUIRED SUB-SKILL: Usar superpowers:subagent-driven-development o superpowers:executing-plans. Los steps usan checkbox (`- [ ]`) para tracking.

**Goal:** Reemplazar gabinetes procedurales por un modelo GLB, spawnear la cámara afuera de la sala, y agregar un gate de PIN para entrar.

**Architecture:** Import map en HTML para `three/addons/`. `scene.js` carga el GLB async, lo clona 4 veces. Nuevo módulo `js/pin.js` para UI overlay. `game.js` gana state `inside` y funciones `tryEnterPin`/`addPinDigit`/`clearPinInput`. La cámara se clampa a `z >= 19` mientras `!inside`.

**Tech Stack:** ES6 modules, Three.js r128 + addons (CDN via import map), HTML5, CSS3, Node.js 18+ (tests).

---

## Archivos del plan

**Crear:**
- `js/pin.js` — UI del PIN overlay

**Modificar:**
- `server-simulator.html` — importmap + markup del PIN overlay
- `styles.css` — estilos del PIN overlay
- `js/scene.js` — load GLB, instantiate cabinets, build door and wall
- `js/input.js` — handler de teclado numérico cuando PIN está abierto
- `js/game.js` — state `inside`, `pinInput`, `tryEnterPin`, `addPinDigit`, `clearPinInput`, modificar `startGame`, `updateMovement`, `updateInteractionHints`
- `js/main.js` — wire setupPinUI (si game.js no lo hace directo)

---

## Task 1: Actualizar server-simulator.html (importmap + PIN overlay)

**Files:**
- Modificar: `server-simulator.html`

- [ ] **Step 1: Agregar el importmap en el `<head>`**

Insertar este bloque ANTES del `<script src="...three..."></script>`:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/"
  }
}
</script>
```

El script de Three.js (sin type="module") DEBE quedarse antes del importmap, o el importmap no funciona en algunos browsers. O mejor: el importmap va PRIMERO en el head, después los scripts.

Orden final en `<head>`:
```html
<script type="importmap">{ ... }</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script type="module" src="js/main.js"></script>
```

- [ ] **Step 2: Agregar el markup del PIN overlay dentro del `<body>`**

Insertar este bloque justo antes del `<div id="overlay">`:

```html
<div id="pin-overlay">
  <div id="pin-panel">
    <h2 id="pin-title">🔐 ACCESO RESTRINGIDO</h2>
    <p id="pin-instruction">Ingresa el PIN de 4 dígitos para entrar</p>
    <div id="pin-display">
      <span class="pin-slot" data-i="0">_</span>
      <span class="pin-slot" data-i="1">_</span>
      <span class="pin-slot" data-i="2">_</span>
      <span class="pin-slot" data-i="3">_</span>
    </div>
    <div id="pin-message"></div>
    <div id="pin-keypad">
      <button class="pin-key" data-digit="1">1</button>
      <button class="pin-key" data-digit="2">2</button>
      <button class="pin-key" data-digit="3">3</button>
      <button class="pin-key" data-digit="4">4</button>
      <button class="pin-key" data-digit="5">5</button>
      <button class="pin-key" data-digit="6">6</button>
      <button class="pin-key" data-digit="7">7</button>
      <button class="pin-key" data-digit="8">8</button>
      <button class="pin-key" data-digit="9">9</button>
      <button class="pin-key pin-key-action" data-action="clear">⌫</button>
      <button class="pin-key" data-digit="0">0</button>
      <button class="pin-key pin-key-action" data-action="submit">↵</button>
    </div>
    <p id="pin-hint">ESC para cerrar</p>
  </div>
</div>
```

- [ ] **Step 3: Verificar que los IDs requeridos por JS existen**

El bloque anterior debe estar presente. El HTML debe terminar con:
```html
<div id="pin-overlay">...</div>
<div id="overlay"></div>
<div id="terminal">...</div>
```

- [ ] **Step 4: Commit**

```bash
git add server-simulator.html
git commit -m "feat: add importmap and PIN overlay markup"
```

---

## Task 2: Actualizar styles.css (estilos del PIN)

**Files:**
- Modificar: `styles.css`

- [ ] **Step 1: Agregar estilos del PIN al final de `styles.css`**

Appendear este bloque al final del archivo:

```css
#pin-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 150;
  display: none;
  align-items: center;
  justify-content: center;
  font-family: monospace;
}
#pin-overlay.open { display: flex; }
#pin-panel {
  background: #0d1117;
  border: 1px solid #30ff7033;
  border-radius: 8px;
  padding: 28px 32px;
  min-width: 320px;
  box-shadow: 0 0 40px rgba(0, 255, 100, 0.15);
  text-align: center;
}
#pin-title {
  color: #00ff88;
  font-size: 18px;
  margin: 0 0 8px;
  letter-spacing: 2px;
}
#pin-instruction {
  color: #6a9f7a;
  font-size: 12px;
  margin: 0 0 20px;
}
#pin-display {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 16px 0;
}
.pin-slot {
  display: inline-block;
  width: 36px; height: 44px;
  line-height: 44px;
  border: 1px solid #00ff4455;
  border-radius: 4px;
  color: #00ff88;
  font-size: 22px;
  background: #161b22;
}
.pin-slot.filled { border-color: #00ff88; }
#pin-message {
  color: #ff6b6b;
  font-size: 12px;
  min-height: 18px;
  margin: 8px 0;
}
#pin-message.success { color: #00ff88; }
#pin-keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 16px 0;
}
.pin-key {
  padding: 14px;
  font-family: monospace;
  font-size: 18px;
  background: #161b22;
  color: #00ff88;
  border: 1px solid #00ff4433;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}
.pin-key:hover { background: rgba(0, 255, 136, 0.1); }
.pin-key:active { background: rgba(0, 255, 136, 0.2); }
.pin-key-action { color: #7ec8e3; }
#pin-hint {
  color: #6a9f7a;
  font-size: 10px;
  margin: 12px 0 0;
}
@keyframes pin-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
#pin-panel.error { animation: pin-shake 0.4s; }
#pin-panel.success { border-color: #00ff88; box-shadow: 0 0 60px rgba(0, 255, 100, 0.4); }
```

- [ ] **Step 2: Commit**

```bash
git add styles.css
git commit -m "feat: add PIN overlay styles"
```

---

## Task 3: Crear js/pin.js

**Files:**
- Crear: `js/pin.js`

- [ ] **Step 1: Crear `js/pin.js`**

```javascript
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
```

- [ ] **Step 2: Verificar sintaxis**

```bash
cd /Users/francisco/Desktop/serviz
node --check js/pin.js
echo "exit: $?"
```

Expected: `exit: 0`.

- [ ] **Step 3: Commit**

```bash
git add js/pin.js
git commit -m "feat: add pin.js overlay UI module"
```

---

## Task 4: Actualizar js/input.js (handler PIN)

**Files:**
- Modificar: `js/input.js`

- [ ] **Step 1: Reemplazar el contenido de `js/input.js`**

```javascript
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
```

- [ ] **Step 2: Verificar sintaxis**

```bash
cd /Users/francisco/Desktop/serviz
node --check js/input.js
echo "exit: $?"
```

Expected: `exit: 0`.

- [ ] **Step 3: Verificar que los tests siguen pasando**

```bash
cd /Users/francisco/Desktop/serviz
node --test tests/commands.test.js 2>&1 | tail -6
```

Expected: 8/8 passing.

- [ ] **Step 4: Commit**

```bash
git add js/input.js
git commit -m "feat: add PIN keyboard handlers to input.js"
```

---

## Task 5: Actualizar js/scene.js (GLB + door + wall)

**Files:**
- Modificar: `js/scene.js`

- [ ] **Step 1: Reemplazar el contenido de `js/scene.js`**

```javascript
// js/scene.js — Three.js scene, GLB server cabinets, door and wall, render helpers

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

scene.background = new THREE.Color(0x050a08);
scene.fog = new THREE.Fog(0x050a08, 20, 60);
camera.position.set(0, 1.7, 22);

const cabinetMeshes = [];
let doorMesh = null;

const serverData = [
  { id: 'server-01', name: 'Web Server',    pos: [-6, 0, -4] },
  { id: 'server-02', name: 'DB Server',     pos: [6,  0, -4] },
  { id: 'server-03', name: 'App Server',    pos: [-6, 0,  4] },
  { id: 'server-04', name: 'Backup Server', pos: [6,  0,  4] }
];

export function getDoor() { return doorMesh; }

function loadServerModel() {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      'model/servidor.glb',
      gltf => resolve(gltf.scene),
      undefined,
      err => reject(err)
    );
  });
}

function instantiateCabinet(data, modelTemplate) {
  const cabinet = modelTemplate.clone(true);
  cabinet.userData = { serverId: data.id, serverName: data.name, interactive: true };
  cabinet.position.set(data.pos[0], 0, data.pos[2]);
  const glowLight = new THREE.PointLight(0x00ff44, 0.6, 3);
  glowLight.position.set(0, 2, 0.8);
  cabinet.add(glowLight);
  cabinet.userData.glowLight = glowLight;
  return cabinet;
}

function buildDoorAndWall() {
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x070f0a });
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x4a0a0a });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x1a2e1f });

  // Wall split into two segments (left + right of the door)
  // Doorway is 2.5 wide, 3.5 tall, centered at x=0, z=18
  const wallY = 2.5;
  const wallZ = 18;
  const wallThickness = 0.3;
  const doorWidth = 2.5;
  const doorHeight = 3.5;
  const sideWidth = (40 - doorWidth) / 2;

  const wallLeft = new THREE.Mesh(
    new THREE.BoxGeometry(sideWidth, 5, wallThickness),
    wallMat
  );
  wallLeft.position.set(-(doorWidth / 2 + sideWidth / 2), wallY, wallZ);
  scene.add(wallLeft);

  const wallRight = wallLeft.clone();
  wallRight.position.x = (doorWidth / 2 + sideWidth / 2);
  scene.add(wallRight);

  // Top section above the door
  const wallTop = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth, 5 - doorHeight, wallThickness),
    wallMat
  );
  wallTop.position.set(0, wallY + doorHeight / 2 + (5 - doorHeight) / 2, wallZ);
  scene.add(wallTop);

  // Door frame (visible decoration around the doorway)
  const frameThickness = 0.1;
  const frameDepth = 0.4;
  const topFrame = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth + frameThickness * 2, frameThickness, frameDepth),
    frameMat
  );
  topFrame.position.set(0, doorHeight, wallZ);
  scene.add(topFrame);

  const leftFrame = new THREE.Mesh(
    new THREE.BoxGeometry(frameThickness, doorHeight, frameDepth),
    frameMat
  );
  leftFrame.position.set(-(doorWidth / 2 + frameThickness / 2), doorHeight / 2, wallZ);
  scene.add(leftFrame);

  const rightFrame = leftFrame.clone();
  rightFrame.position.x = (doorWidth / 2 + frameThickness / 2);
  scene.add(rightFrame);

  // The door itself (the moving part)
  doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth - 0.05, doorHeight - 0.05, 0.15),
    doorMat
  );
  doorMesh.position.set(0, doorHeight / 2, wallZ);
  doorMesh.userData = { isDoor: true, open: false, closedX: 0, openX: -12, closedColor: 0x4a0a0a, openColor: 0x0a4a1a };
  scene.add(doorMesh);
}

export async function buildScene() {
  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshLambertMaterial({ color: 0x0a1a0f })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  scene.add(new THREE.GridHelper(40, 40, 0x0d2b15, 0x0d2b15));

  // Ceiling
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshLambertMaterial({ color: 0x060d09 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 5;
  scene.add(ceil);

  // Side and back walls (leave z=18 area for the door+wall section)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x070f0a });
  [
    [40, 5, 0.3,  0, 2.5, -20],
    [0.3, 5, 40, -20, 2.5,  0],
    [0.3, 5, 40,  20, 2.5,  0]
  ].forEach(([w, h, d, x, y, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    scene.add(m);
  });

  // Lighting
  scene.add(new THREE.AmbientLight(0x112215, 1.5));
  const mainLight = new THREE.DirectionalLight(0x20ff60, 0.3);
  mainLight.position.set(0, 8, 0);
  scene.add(mainLight);

  // Ceiling strips
  for (let i = -3; i <= 3; i += 2) {
    const stripLight = new THREE.PointLight(0x00ff88, 0.4, 25);
    stripLight.position.set(i * 3, 4.5, 0);
    scene.add(stripLight);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.05, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    strip.position.set(i * 3, 4.8, 0);
    scene.add(strip);
  }

  // Door + wall (with doorway)
  buildDoorAndWall();

  // Load GLB model and instantiate cabinets
  const modelTemplate = await loadServerModel();
  serverData.forEach(s => {
    const cabinet = instantiateCabinet(s, modelTemplate);
    scene.add(cabinet);
    cabinetMeshes.push(cabinet);
  });

  // Floor cables
  for (let i = 0; i < 6; i++) {
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 12, 6),
      new THREE.MeshLambertMaterial({ color: [0x003300, 0x000066, 0x330000, 0x333300][i % 4] })
    );
    cable.rotation.z = Math.PI / 2;
    cable.position.set(0, 0.05 + i * 0.08, (i - 3) * 1.5);
    scene.add(cable);
  }
}

export function getNearestServer() {
  let minDist = Infinity, nearest = null;
  for (const m of cabinetMeshes) {
    const dx = camera.position.x - m.position.x;
    const dz = camera.position.z - m.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minDist) { minDist = dist; nearest = m; }
  }
  return nearest ? { mesh: nearest, dist: minDist } : null;
}

export function getCamera() { return camera; }
export function getCabinetMeshes() { return cabinetMeshes; }

export function renderFrame() {
  renderer.render(scene, camera);
}

export function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
```

- [ ] **Step 2: Verificar sintaxis**

```bash
cd /Users/francisco/Desktop/serviz
node --check js/scene.js
echo "exit: $?"
```

Expected: `exit: 0`.

- [ ] **Step 3: Verificar que los tests siguen pasando**

```bash
cd /Users/francisco/Desktop/serviz
node --test tests/commands.test.js 2>&1 | tail -6
```

Expected: 8/8 passing.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js
git commit -m "feat: load server GLB, add door and wall with doorway"
```

---

## Task 6: Actualizar js/game.js (state inside, PIN, bounds)

**Files:**
- Modificar: `js/game.js`

- [ ] **Step 1: Reemplazar el contenido de `js/game.js`**

```javascript
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
```

- [ ] **Step 2: Verificar sintaxis**

```bash
cd /Users/francisco/Desktop/serviz
node --check js/game.js
echo "exit: $?"
```

Expected: `exit: 0`.

- [ ] **Step 3: Verificar tests**

```bash
cd /Users/francisco/Desktop/serviz
node --test tests/commands.test.js 2>&1 | tail -6
```

Expected: 8/8 passing.

- [ ] **Step 4: Commit**

```bash
git add js/game.js
git commit -m "feat: add inside state, PIN logic, outside spawn position"
```

---

## Task 7: Verificación final

**Files:**
- (no code changes)

- [ ] **Step 1: Verificar que el GLB se sirve por HTTP**

```bash
cd /Users/francisco/Desktop/serviz
python3 -m http.server 8765 > /tmp/http.log 2>&1 &
echo $! > /tmp/http.pid
sleep 1
curl -s -o /dev/null -w "HTTP %{http_code} | size=%{size_download}\n" http://localhost:8765/model/servidor.glb
curl -s -o /dev/null -w "HTTP %{http_code} | size=%{size_download}\n" http://localhost:8765/js/main.js
curl -s -o /dev/null -w "HTTP %{http_code} | size=%{size_download}\n" http://localhost:8765/js/pin.js
curl -s -o /dev/null -w "HTTP %{http_code} | size=%{size_download}\n" http://localhost:8765/js/scene.js
curl -s -o /dev/null -w "HTTP %{http_code} | size=%{size_download}\n" http://localhost:8765/js/game.js
kill $(cat /tmp/http.pid) 2>/dev/null
rm /tmp/http.pid /tmp/http.log
```

Expected: 5 `HTTP 200` lines.

- [ ] **Step 2: Verificar que el módulo graph loads**

```bash
cd /Users/francisco/Desktop/serviz
node --input-type=module -e "
const files = ['js/scene.js','js/terminal.js','js/commands.js','js/input.js','js/pin.js','js/game.js','js/main.js'];
for (const f of files) {
  try { await import('./' + f); console.log('OK:', f); }
  catch (e) {
    if (e.message.includes('THREE') || e.message.includes('document') || e.message.includes('window') || e.message.includes('GLTFLoader') || e.message.includes('navigator')) {
      console.log('OK (browser-only):', f);
    } else { console.error('UNEXPECTED in', f, ':', e.message); process.exit(1); }
  }
}
"
```

Expected: 7 lines, all OK.

- [ ] **Step 3: Verificar que git status está limpio**

```bash
cd /Users/francisco/Desktop/serviz
git status
git log --oneline
```

Expected: clean working tree, 17 commits (12 from refactor + 5 from this plan).

- [ ] **Step 4: Verificar checklist del feature**

- [ ] El HTML tiene importmap y PIN overlay
- [ ] Los estilos del PIN están en styles.css
- [ ] `js/pin.js` existe
- [ ] `js/scene.js` carga el GLB
- [ ] `js/game.js` tiene state `inside` y funciones de PIN
- [ ] Los tests siguen pasando (8/8)

---

## Resumen

Después de las 7 tasks:

- 12 archivos de código en `js/`, `model/`, `styles.css`, `server-simulator.html`
- Cámara spawna afuera en (0, 1.7, 22)
- PIN gate funcional: tipear 1234 abre la puerta
- Gabinetes ahora se ven con el modelo GLB
- Flujo original (acercarse, E, terminal, comandos) intacto cuando estás adentro
- 8/8 tests pasando
- 5 nuevos commits, 17 totales

## Riesgos residuales

- La escala/rotación del GLB puede necesitar ajuste empírico cuando se vea en el browser. Si el modelo se ve muy chico o muy grande, ajustar `cabinet.scale.set(...)` y `cabinet.rotation.y` en `instantiateCabinet`.
- El import map requiere internet en runtime (CDN).
- La puerta no se "cierra" automáticamente si salís de la sala. Si el usuario quiere eso, es otra iteración.
