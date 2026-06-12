# Server Simulator — Plan de Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan task por task. Los steps usan checkbox (`- [ ]`) para tracking.

**Goal:** Extraer CSS y JS del HTML monolítico a archivos propios, y dividir el JS en 6 módulos ES6 por responsabilidad, sin cambiar comportamiento.

**Architecture:** Refactor literal de código existente. CSS va a `styles.css`. JS se divide en módulos ES6 nativos (sin bundler). Three.js se sigue cargando como script clásico (sin `type="module"`) para exponer `THREE` como global. State compartido entre módulos via getters exportados desde `game.js`.

**Tech Stack:** HTML5, CSS3, JavaScript ES6 modules, Three.js r128 (CDN), Node.js 18+ (para correr tests).

---

## Archivos del plan

**Crear:**
- `styles.css` — CSS extraído del `<style>` actual
- `js/main.js` — entry point
- `js/scene.js` — Three.js (scene, camera, cabinets, animate)
- `js/terminal.js` — UI terminal (print, open, close)
- `js/commands.js` — lógica comandos Linux + state
- `js/input.js` — teclado, mouse, pointerlock
- `js/game.js` — state global, objetivos, startGame
- `tests/commands.test.js` — tests de funciones puras de commands.js
- `.gitignore` — para node_modules, etc.

**Modificar:**
- `server-simulator.html` — reemplazar `<style>` y `<script>` inline por `<link>` y `<script type="module">`. Quitar `onclick=` inline.

---

## Task 0: Inicializar git y estructura base

**Files:**
- Crear: `.gitignore`

- [ ] **Step 1: Inicializar repositorio git**

```bash
cd /Users/francisco/Desktop/serviz
git init
git config user.email "francisco@local"
git config user.name "Francisco"
```

- [ ] **Step 2: Crear `.gitignore`**

```gitignore
.DS_Store
node_modules/
*.log
.vscode/
.idea/
```

- [ ] **Step 3: Crear estructura de directorios**

```bash
mkdir -p js tests docs/superpowers/specs docs/superpowers/plans
```

- [ ] **Step 4: Commit inicial**

```bash
git add .gitignore docs/
git commit -m "chore: init repo with docs structure"
```

---

## Task 1: Extraer CSS a styles.css

**Files:**
- Crear: `styles.css`

- [ ] **Step 1: Crear `styles.css` con todo el contenido del `<style>` actual**

Copiar literal desde `server-simulator.html` líneas 8-156 al nuevo archivo. El archivo `styles.css` debe contener exactamente esto:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; overflow: hidden; font-family: monospace; }
#canvas { display: block; width: 100vw; height: 100vh; }
#crosshair {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 20px; height: 20px;
  pointer-events: none; z-index: 10;
}
#crosshair::before, #crosshair::after {
  content: '';
  position: absolute;
  background: rgba(255,255,255,0.8);
}
#crosshair::before { width: 2px; height: 100%; left: 50%; transform: translateX(-50%); }
#crosshair::after { width: 100%; height: 2px; top: 50%; transform: translateY(-50%); }
#hud {
  position: fixed; top: 16px; left: 16px;
  color: #00ff88; font-size: 13px;
  background: rgba(0,0,0,0.7);
  border: 1px solid #00ff4433;
  padding: 10px 14px; border-radius: 6px;
  line-height: 1.8; z-index: 10;
}
#interact-hint {
  position: fixed; bottom: 80px; left: 50%;
  transform: translateX(-50%);
  color: #fff; font-size: 14px;
  background: rgba(0,0,0,0.8);
  border: 1px solid #ffffff33;
  padding: 8px 18px; border-radius: 20px;
  z-index: 10; display: none;
  letter-spacing: 1px;
}
#controls-hint {
  position: fixed; bottom: 20px; left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.5); font-size: 12px;
  z-index: 10; text-align: center;
}
#terminal {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 680px; max-width: 95vw;
  height: 460px;
  background: #0d1117;
  border: 1px solid #30ff7033;
  border-radius: 8px;
  z-index: 100;
  display: none;
  flex-direction: column;
  box-shadow: 0 0 40px rgba(0,255,100,0.15);
  overflow: hidden;
}
#terminal-header {
  background: #161b22;
  padding: 8px 14px;
  display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid #30ff7022;
  flex-shrink: 0;
}
.t-dot { width: 12px; height: 12px; border-radius: 50%; }
#terminal-title {
  color: #8b949e; font-size: 12px; margin-left: 6px;
  flex: 1;
}
#terminal-close {
  color: #8b949e; font-size: 18px; cursor: pointer;
  background: none; border: none; padding: 0 4px;
}
#terminal-close:hover { color: #fff; }
#terminal-body {
  flex: 1; overflow-y: auto;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.6;
  color: #e6edf3;
  font-family: 'Courier New', monospace;
}
#terminal-body::-webkit-scrollbar { width: 4px; }
#terminal-body::-webkit-scrollbar-thumb { background: #30ff7033; }
.t-line { margin: 1px 0; white-space: pre-wrap; word-break: break-all; }
.t-prompt { color: #00ff88; }
.t-output { color: #b0c4de; }
.t-error { color: #ff6b6b; }
.t-success { color: #00ff88; }
.t-info { color: #7ec8e3; }
.t-warn { color: #ffd700; }
#terminal-input-row {
  display: flex; align-items: center;
  padding: 8px 14px;
  border-top: 1px solid #30ff7022;
  flex-shrink: 0;
  background: #0d1117;
}
#terminal-prompt-label { color: #00ff88; font-size: 13px; white-space: nowrap; }
#terminal-input {
  flex: 1; background: transparent; border: none; outline: none;
  color: #e6edf3; font-family: 'Courier New', monospace;
  font-size: 13px; margin-left: 6px; caret-color: #00ff88;
}
#server-label {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -200%);
  color: #00ff88; font-size: 11px; font-family: monospace;
  background: rgba(0,0,0,0.75); padding: 3px 8px;
  border-radius: 4px; z-index: 10; display: none;
  pointer-events: none;
}
#overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  z-index: 90; display: none;
}
#click-to-start {
  position: fixed; inset: 0;
  background: rgba(0,10,5,0.92);
  z-index: 200;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  color: #00ff88; font-family: monospace;
  text-align: center;
}
#click-to-start h1 { font-size: 28px; letter-spacing: 3px; margin-bottom: 12px; }
#click-to-start p { color: #6a9f7a; font-size: 14px; margin: 4px 0; }
#click-to-start .start-btn {
  margin-top: 28px;
  padding: 12px 32px;
  border: 1px solid #00ff88;
  background: transparent; color: #00ff88;
  font-family: monospace; font-size: 15px;
  cursor: pointer; border-radius: 4px;
  letter-spacing: 2px;
  transition: background 0.2s;
}
#click-to-start .start-btn:hover { background: rgba(0,255,136,0.1); }
#objectives {
  position: fixed; top: 16px; right: 16px;
  color: #e6edf3; font-size: 12px;
  background: rgba(0,0,0,0.7);
  border: 1px solid #ffffff22;
  padding: 10px 14px; border-radius: 6px;
  z-index: 10; min-width: 200px;
  font-family: monospace;
}
#objectives h3 { color: #7ec8e3; font-size: 11px; letter-spacing: 1px; margin-bottom: 8px; }
.obj-item { display: flex; align-items: center; gap: 6px; margin: 4px 0; font-size: 11px; }
.obj-check { color: #00ff88; }
.obj-pending { color: #ffffff44; }
```

- [ ] **Step 2: Verificar el archivo**

```bash
wc -l styles.css server-simulator.html
```

Expected: `styles.css` tiene 149 líneas, `server-simulator.html` sigue intacto.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "refactor: extract CSS to styles.css"
```

---

## Task 2: Crear js/scene.js

**Files:**
- Crear: `js/scene.js`

- [ ] **Step 1: Crear `js/scene.js`**

Copiar literal el bloque de construcción de escena (líneas 207-217 y 241-312 y 314-362 y 654-663 del HTML actual) y exponerlo como funciones exportadas. El módulo no tiene dependencias de otros módulos del proyecto. Usa `THREE` como global.

```javascript
// js/scene.js — Three.js scene, cabinets, render loop

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

scene.background = new THREE.Color(0x050a08);
scene.fog = new THREE.Fog(0x050a08, 20, 60);
camera.position.set(0, 1.7, 8);

const cabinetMeshes = [];

const serverData = [
  { id: 'server-01', name: 'Web Server',    pos: [-6, 0, -4] },
  { id: 'server-02', name: 'DB Server',     pos: [6,  0, -4] },
  { id: 'server-03', name: 'App Server',    pos: [-6, 0,  4] },
  { id: 'server-04', name: 'Backup Server', pos: [6,  0,  4] }
];

export function buildScene() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshLambertMaterial({ color: 0x0a1a0f })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  scene.add(new THREE.GridHelper(40, 40, 0x0d2b15, 0x0d2b15));

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshLambertMaterial({ color: 0x060d09 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 5;
  scene.add(ceil);

  const wallMat = new THREE.MeshLambertMaterial({ color: 0x070f0a });
  [
    [40, 5, 0.3,  0, 2.5, -20],
    [40, 5, 0.3,  0, 2.5,  20],
    [0.3, 5, 40, -20, 2.5,  0],
    [0.3, 5, 40,  20, 2.5,  0]
  ].forEach(([w, h, d, x, y, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    scene.add(m);
  });

  scene.add(new THREE.AmbientLight(0x112215, 1.5));
  const mainLight = new THREE.DirectionalLight(0x20ff60, 0.3);
  mainLight.position.set(0, 8, 0);
  scene.add(mainLight);

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

  serverData.forEach(s => {
    const cabinet = buildCabinet(s);
    cabinet.userData = { serverId: s.id, serverName: s.name, interactive: true };
    cabinet.position.set(s.pos[0], 0, s.pos[2]);
    scene.add(cabinet);
    cabinetMeshes.push(cabinet);
  });

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

function buildCabinet(data) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x111a14 });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x1a2e1f });
  const panelMat = new THREE.MeshLambertMaterial({ color: 0x0a1a0f });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4, 1), bodyMat);
  body.position.y = 2; body.castShadow = true;
  group.add(body);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.42, 4.02, 1.02), frameMat);
  frame.position.y = 2;
  group.add(frame);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.6, 0.02), panelMat);
  panel.position.set(0, 2, 0.52);
  group.add(panel);

  const ledColors = [0x00ff00, 0x00aaff, 0xff8800, 0xff0000, 0x00ffff];
  const ledGeo = new THREE.BoxGeometry(0.05, 0.05, 0.01);

  for (let i = 0; i < 8; i++) {
    const unit = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.18, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x151f18 })
    );
    unit.position.set(0, 0.8 + i * 0.24, 0.38);
    group.add(unit);

    const led1 = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({
      color: Math.random() > 0.3 ? ledColors[Math.floor(Math.random() * ledColors.length)] : 0x111111
    }));
    led1.position.set(-0.42, 0.8 + i * 0.24, 0.55);
    group.add(led1);

    const led2 = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0x00ff00 : 0x003300
    }));
    led2.position.set(-0.36, 0.8 + i * 0.24, 0.55);
    group.add(led2);
  }

  const glowLight = new THREE.PointLight(0x00ff44, 0.6, 3);
  glowLight.position.set(0, 2, 0.8);
  group.add(glowLight);
  group.userData.glowLight = glowLight;

  return group;
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
```

- [ ] **Step 2: Commit**

```bash
git add js/scene.js
git commit -m "refactor: extract Three.js scene to js/scene.js"
```

---

## Task 3: Crear js/terminal.js

**Files:**
- Crear: `js/terminal.js`

- [ ] **Step 1: Crear `js/terminal.js`**

Funciones puras de UI. No tiene dependencias de otros módulos del proyecto. Las mutaciones de state (terminalOpen, currentServer) las maneja `game.js` que es el dueño del state.

```javascript
// js/terminal.js — UI terminal: print, open, close, escapeHtml

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
}

export function closeTerminal() {
  terminalEl.style.display = 'none';
  overlayEl.style.display = 'none';
  terminalInput.value = '';
}

export function clearTerminal() {
  terminalBody.innerHTML = '';
}

export function setupTerminalInput(onSubmit) {
  terminalInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const cmd = terminalInput.value; terminalInput.value = '';
      onSubmit(cmd);
    }
  });
}

export function focusTerminalInput() {
  terminalInput.focus();
}
```

- [ ] **Step 2: Commit**

```bash
git add js/terminal.js
git commit -m "refactor: extract terminal UI to js/terminal.js"
```

---

## Task 4: Crear tests de commands.js (TDD)

**Files:**
- Crear: `tests/commands.test.js`

- [ ] **Step 1: Crear el archivo de tests**

```javascript
// tests/commands.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getUsers, getSudoUsers, setUser, removeUser, addSudoUser, resetState } from '../js/commands.js';

test('getUsers returns root by default', () => {
  resetState();
  const users = getUsers();
  assert.equal(users.root, true);
});

test('setUser adds a new user', () => {
  resetState();
  setUser('sysadmin');
  const users = getUsers();
  assert.equal(users.sysadmin, true);
});

test('setUser does not overwrite existing user', () => {
  resetState();
  setUser('devops');
  setUser('devops');
  const users = getUsers();
  assert.equal(Object.keys(users).filter(k => k === 'devops').length, 1);
});

test('removeUser deletes a user', () => {
  resetState();
  setUser('backup');
  removeUser('backup');
  const users = getUsers();
  assert.equal(users.backup, undefined);
});

test('removeUser removes user from sudo group', () => {
  resetState();
  setUser('ops');
  addSudoUser('ops');
  removeUser('ops');
  const sudo = getSudoUsers();
  assert.equal(sudo.includes('ops'), false);
});

test('addSudoUser adds user to sudo list', () => {
  resetState();
  setUser('admin');
  addSudoUser('admin');
  const sudo = getSudoUsers();
  assert.equal(sudo.includes('admin'), true);
});

test('addSudoUser does not duplicate', () => {
  resetState();
  setUser('admin');
  addSudoUser('admin');
  addSudoUser('admin');
  const sudo = getSudoUsers();
  assert.equal(sudo.filter(u => u === 'admin').length, 1);
});

test('resetState clears all non-root users and sudo', () => {
  resetState();
  setUser('a');
  setUser('b');
  addSudoUser('a');
  resetState();
  const users = getUsers();
  const sudo = getSudoUsers();
  assert.equal(users.root, true);
  assert.equal(Object.keys(users).length, 1);
  assert.equal(sudo.length, 0);
});
```

- [ ] **Step 2: Correr tests para verificar que fallan**

```bash
node --test tests/commands.test.js
```

Expected: ERROR — `Cannot find module '../js/commands.js'`. Esto es correcto (TDD: rojo primero).

- [ ] **Step 3: Commit (test rojo)**

```bash
git add tests/commands.test.js
git commit -m "test: add failing tests for commands.js state functions"
```

---

## Task 5: Implementar js/commands.js (verde)

**Files:**
- Crear: `js/commands.js`

- [ ] **Step 1: Crear `js/commands.js`**

```javascript
// js/commands.js — Linux command simulator + state

let users = { root: true };
let userGroups = { root: ['root', 'sudo'] };
let sudoUsers = [];
let commandHistory = [];
let historyIndex = -1;

export function getUsers() { return { ...users }; }
export function getSudoUsers() { return [...sudoUsers]; }

export function setUser(name) {
  users[name] = true;
  if (!userGroups[name]) userGroups[name] = [name];
}

export function removeUser(name) {
  delete users[name];
  delete userGroups[name];
  sudoUsers = sudoUsers.filter(u => u !== name);
}

export function addSudoUser(name) {
  if (!sudoUsers.includes(name)) sudoUsers.push(name);
}

export function resetState() {
  users = { root: true };
  userGroups = { root: ['root', 'sudo'] };
  sudoUsers = [];
  commandHistory = [];
  historyIndex = -1;
}

const helpText = `Comandos disponibles:
  useradd <usuario>           Crear nuevo usuario
  useradd -m <usuario>        Crear usuario con directorio home
  userdel <usuario>           Eliminar usuario
  passwd <usuario>            Cambiar contraseña
  usermod -aG sudo <usuario>  Agregar usuario al grupo sudo
  usermod -aG <grupo> <user>  Agregar usuario a grupo
  cat /etc/passwd             Ver todos los usuarios
  cat /etc/group              Ver grupos
  id <usuario>                Ver info de usuario
  groups <usuario>            Ver grupos de usuario
  who                         Ver usuarios conectados
  whoami                      Usuario actual
  ls /home                    Ver directorios home
  clear                       Limpiar terminal
  help                        Mostrar esta ayuda`;

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function processCommand(raw, deps) {
  const { print, printPrompt, checkObjective, closeTerminal } = deps;
  const cmd = raw.trim();
  if (!cmd) return;
  commandHistory.unshift(cmd);
  historyIndex = -1;
  printPrompt(cmd);

  const parts = cmd.split(/\s+/);
  const base = parts[0];

  if (base === 'clear')  { document.getElementById('terminal-body').innerHTML = ''; return; }
  if (base === 'help')   { print(helpText, 'info'); return; }
  if (base === 'whoami') { print('root', 'output'); return; }
  if (base === 'pwd')    { print('/root', 'output'); return; }
  if (base === 'hostname') { print('server-01', 'output'); return; }

  if (base === 'uname') {
    print(parts.includes('-a')
      ? 'Linux server-01 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux'
      : 'Linux', 'output');
    return;
  }

  if (base === 'uptime') {
    print(' 11:42:00 up 7 days, 3:14,  1 user,  load average: 0.08, 0.12, 0.10', 'output');
    return;
  }

  if (base === 'echo') {
    print(parts.slice(1).join(' ').replace(/"/g, ''), 'output'); return;
  }

  if (base === 'who') {
    print('USER     TTY      FROM             LOGIN@', 'output');
    print('root     pts/0    192.168.1.10     10:42', 'output');
    Object.keys(users).filter(u => u !== 'root').forEach(u => {
      print(`${u.padEnd(9)}pts/1    192.168.1.11     11:00`, 'output');
    });
    return;
  }

  if (base === 'ls' && parts[1] === '/home') {
    const homes = Object.keys(users).filter(u => u !== 'root');
    print(homes.length ? homes.join('  ') : '(vacío)', 'output');
    return;
  }

  if (base === 'cat' && parts[1] === '/etc/passwd') {
    checkObjective('list');
    print('root:x:0:0:root:/root:/bin/bash', 'output');
    let uid = 1000;
    Object.keys(users).filter(u => u !== 'root').forEach(u => {
      print(`${u}:x:${uid}:${uid}::/home/${u}:/bin/bash`, 'output'); uid++;
    });
    return;
  }

  if (base === 'cat' && parts[1] === '/etc/group') {
    print('root:x:0:root', 'output');
    print('sudo:x:27:' + sudoUsers.join(','), 'output');
    print('users:x:100:' + Object.keys(users).filter(u => u !== 'root').join(','), 'output');
    return;
  }

  if (base === 'useradd') {
    let username;
    if (parts[1] === '-m' && parts[2]) { username = parts[2]; }
    else if (parts[1] && !parts[1].startsWith('-')) { username = parts[1]; }
    else { print('useradd: falta nombre de usuario', 'error'); return; }

    if (!/^[a-z_][a-z0-9_-]*$/.test(username)) {
      print(`useradd: '${username}' nombre de usuario inválido`, 'error'); return;
    }
    if (users[username]) {
      print(`useradd: el usuario '${username}' ya existe`, 'error'); return;
    }
    setUser(username);
    print(`Agregando usuario '${username}'...`, 'output');
    print(`Agregando nuevo grupo '${username}' (1001)`, 'output');
    print(`Creando directorio home '/home/${username}'`, 'output');
    print(`Agregando nuevo usuario '${username}' (1001) con grupo '${username}'`, 'output');
    if (username === 'sysadmin') checkObjective('sysadmin');
    if (username === 'devops')   checkObjective('devops');
    if (username === 'backup')   checkObjective('backup');
    return;
  }

  if (base === 'userdel') {
    const username = parts[1];
    if (!username) { print('userdel: falta nombre de usuario', 'error'); return; }
    if (!users[username]) { print(`userdel: el usuario '${username}' no existe`, 'error'); return; }
    if (username === 'root') { print('userdel: no se puede eliminar el usuario root', 'error'); return; }
    removeUser(username);
    print(`Eliminando usuario '${username}'`, 'output');
    return;
  }

  if (base === 'passwd') {
    const username = parts[1] || 'root';
    if (!users[username]) { print(`passwd: usuario '${username}' no encontrado`, 'error'); return; }
    print(`passwd: contraseña actualizada exitosamente para '${username}'`, 'success');
    return;
  }

  if (base === 'usermod') {
    const gFlag = parts.indexOf('-aG');
    if (gFlag !== -1 && parts[gFlag + 1] && parts[gFlag + 2]) {
      const group = parts[gFlag + 1], username = parts[gFlag + 2];
      if (!users[username]) { print(`usermod: usuario '${username}' no existe`, 'error'); return; }
      if (!userGroups[username]) userGroups[username] = [];
      if (!userGroups[username].includes(group)) userGroups[username].push(group);
      if (group === 'sudo') { addSudoUser(username); checkObjective('sudo'); }
      print(`Agregando '${username}' al grupo '${group}'`, 'success');
      return;
    }
    print('usermod: uso: usermod -aG <grupo> <usuario>', 'error');
    return;
  }

  if (base === 'id') {
    const username = parts[1] || 'root';
    if (!users[username]) { print(`id: '${username}': no such user`, 'error'); return; }
    const uid = username === 'root' ? 0 : 1000 + Object.keys(users).indexOf(username);
    print(`uid=${uid}(${username}) gid=${uid}(${username}) grupos=${(userGroups[username] || [username]).join(',')}`, 'output');
    return;
  }

  if (base === 'groups') {
    const username = parts[1] || 'root';
    if (!users[username]) { print(`groups: '${username}': no such user`, 'error'); return; }
    print(`${username} : ${(userGroups[username] || [username]).join(' ')}`, 'output');
    return;
  }

  if (base === 'sudo')     { print('root no necesita sudo — ya eres superusuario', 'info'); return; }
  if (base === 'exit')     { print('logout', 'output'); setTimeout(() => closeTerminal(), 600); return; }

  print(`bash: ${escapeHtml(base)}: comando no encontrado. Escribe 'help' para ver comandos.`, 'error');
}
```

- [ ] **Step 2: Correr tests**

```bash
node --test tests/commands.test.js
```

Expected: todos los tests pasan (8 passing).

- [ ] **Step 3: Commit**

```bash
git add js/commands.js
git commit -m "feat: add Linux command simulator with state functions"
```

---

## Task 6: Crear js/input.js

**Files:**
- Crear: `js/input.js`

- [ ] **Step 1: Crear `js/input.js`**

```javascript
// js/input.js — keyboard, mouse, pointerlock handlers

const keys = {};

export function getKey(code) { return !!keys[code]; }

export function setupInput(handlers) {
  const { onKeyE, onMouseMove, onPointerLockChange, onCanvasClick, onOverlayClick } = handlers;

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
    if (onCanvasClick) onCanvasClick();
  });

  document.getElementById('overlay').addEventListener('click', () => {
    if (onOverlayClick) onOverlayClick();
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add js/input.js
git commit -m "refactor: extract input handlers to js/input.js"
```

---

## Task 7: Crear js/game.js

**Files:**
- Crear: `js/game.js`

- [ ] **Step 1: Crear `js/game.js`**

```javascript
// js/game.js — global state, objectives, startGame, animate loop

import { buildScene, getNearestServer, getCamera, getCabinetMeshes, renderFrame } from './scene.js';
import { print, openTerminal, closeTerminal, setupTerminalInput } from './terminal.js';
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
  openTerminal(server);
}

function closeTerminalFor() {
  state.terminalOpen = false;
  state.currentServer = null;
  closeTerminal();
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
  renderFrame();
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
    processCommand(rawCmd, { print, checkObjective, closeTerminal: closeTerminalFor });
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
```

- [ ] **Step 2: Commit**

```bash
git add js/game.js
git commit -m "refactor: extract game state, loop, and wiring to js/game.js"
```

---

## Task 8: Crear js/main.js

**Files:**
- Crear: `js/main.js`

- [ ] **Step 1: Crear `js/main.js`**

```javascript
// js/main.js — entry point

import { setupGame, startGame } from './game.js';
import { resize } from './scene.js';

document.addEventListener('DOMContentLoaded', () => {
  setupGame();
  document.querySelector('.start-btn').addEventListener('click', startGame);
  window.addEventListener('resize', resize);
});
```

- [ ] **Step 2: Commit**

```bash
git add js/main.js
git commit -m "refactor: add main.js entry point"
```

---

## Task 9: Modificar server-simulator.html

**Files:**
- Modificar: `server-simulator.html`

- [ ] **Step 1: Reemplazar el `<style>` por `<link>`**

En `server-simulator.html`, eliminar todo el bloque `<style>...</style>` (líneas 7-156) y reemplazarlo por:

```html
<link rel="stylesheet" href="styles.css">
```

- [ ] **Step 2: Reemplazar los `onclick` inline por nada (se manejan en main.js)**

En `server-simulator.html`:
- Línea 166: `onclick="startGame()"` → `id="start-btn"` (sin onclick)
- Línea 196: `onclick="closeTerminal()"` → `id="terminal-close-btn"` (sin onclick)

- [ ] **Step 3: Reemplazar el bloque `<script>` inline por el módulo**

Eliminar el bloque `<script src="...three..."></script>` y `<script>...</script>` (líneas 205-723). Reemplazar por:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script type="module" src="js/main.js"></script>
```

- [ ] **Step 4: Verificar que el HTML resultante es válido**

```bash
cat server-simulator.html
```

Expected: HTML corto, ~30 líneas, sin CSS ni JS inline. Mantiene todos los elementos del DOM con los mismos IDs y clases.

- [ ] **Step 5: Commit**

```bash
git add server-simulator.html
git commit -m "refactor: link styles.css and js/main.js from HTML"
```

---

## Task 10: Agregar exports faltantes a js/scene.js y verificación final

**Files:**
- Modificar: `js/scene.js`

- [ ] **Step 1: Agregar `renderFrame` y `resize` a `js/scene.js`**

Al final de `js/scene.js` (después de `getCabinetMeshes()`), agregar:

```javascript
export function renderFrame() {
  renderer.render(scene, camera);
}

export function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
```

- [ ] **Step 2: Verificar que los tests siguen pasando**

```bash
node --test tests/commands.test.js
```

Expected: 8 passing.

- [ ] **Step 3: Servir el juego y probar manualmente**

```bash
cd /Users/francisco/Desktop/serviz
python3 -m http.server 8000
```

Abrir `http://localhost:8000/server-simulator.html` en el navegador. Verificar que funciona idéntico a la versión original.

- [ ] **Step 4: Verificar la checklist del juego**

- [ ] El overlay "INICIAR" se ve
- [ ] Click en INICIAR → arranca la escena 3D
- [ ] Se ven los 4 gabinetes en la sala
- [ ] WASD mueve la cámara
- [ ] Mouse rota la vista
- [ ] Acercarse a un gabinete muestra el hint "[E] para acceder"
- [ ] Presionar E abre la terminal
- [ ] El prompt es correcto (`root@server-01:~$`)
- [ ] `help` lista los comandos
- [ ] `useradd sysadmin` crea el usuario y marca objetivo ✓
- [ ] `useradd devops` y `useradd backup` marcan los otros 2 objetivos
- [ ] `usermod -aG sudo sysadmin` marca objetivo sudo
- [ ] `cat /etc/passwd` marca objetivo list y muestra todos los usuarios
- [ ] Los 5 objetivos ✓ → mensaje "TODOS LOS OBJETIVOS COMPLETADOS"
- [ ] ESC cierra la terminal
- [ ] Consola del navegador sin errores

- [ ] **Step 5: Commit final**

```bash
git add js/scene.js
git commit -m "feat: add renderFrame and resize exports to scene.js"
```

---

## Resumen

Después de completar las 11 tasks (Task 0 a Task 10):

- 6 archivos JS en `js/` con responsabilidades claras y un solo dueño de state (`game.js`)
- `styles.css` con todo el CSS extraído literal del HTML original
- `server-simulator.html` reducido a markup + tags de link
- 8 tests pasando para `commands.js` (funciones puras de state)
- Commit history limpio y frecuente (11+ commits, conventional commits)
- Juego funcionando idéntico a la versión original

## Wiring entre módulos — diseño final

`game.js` es el único módulo que posee y muta el state global. Expone funciones de orquestación (`openTerminalFor`, `closeTerminalFor`, `onKeyE`, `onMouseMove`, `onPointerLockChange`) que internamente:

1. Actualizan `state.terminalOpen`, `state.currentServer`, `state.isLocked`, etc.
2. Llaman a las funciones puras de `terminal.js` (`openTerminal`, `closeTerminal`) o disparan el render loop

`input.js` no conoce el state — solo recibe `handlers` y los invoca.
`terminal.js` no conoce el state — solo hace UI.
`scene.js` no conoce el state — solo maneja Three.js.
`commands.js` no conoce el state del juego — solo usuarios y comandos Linux.
`main.js` es un wiring mínimo: llama a `setupGame()`, conecta el botón de inicio y el resize.

## Out of scope (re-confirmado)

- Tests de `processCommand` con mocking de DOM
- Historial de comandos con ArrowUp/ArrowDown (eliminado del refactor, se puede agregar después)
- Refactor del CSS a variables o BEM
- Accesibilidad (ARIA, focus management)
- Bundler, TypeScript, npm

## Riesgos residuales

- **Módulos ES6 + `file://`**: el juego NO funciona abriendo el HTML directamente. Hay que servirlo con `python3 -m http.server` o similar.
- **Carga de Three.js como global**: el script de Three.js se carga en el HTML como script clásico (sin `type="module"`) para exponer `THREE` como global. Los módulos lo consumen directamente. Si Three.js se moviera a un módulo, habría que importarlo con `import * as THREE from '...'`, lo cual agregaría un bundler step.
