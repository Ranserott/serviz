# Server Simulator — Refactor de estructura

**Fecha:** 2026-06-11
**Alcance:** extraer CSS a archivo propio y modularizar JS en archivos por responsabilidad, sin alterar comportamiento.

## Contexto

`server-simulator.html` es un único archivo (~720 líneas) con:

- CSS embebido en `<style>` (~150 líneas)
- JS embebido en `<script>` (~520 líneas) que arma una escena 3D en Three.js y simula una terminal Linux
- HTML con el esqueleto de la UI (canvas, HUD, overlay, terminal, objetivos)
- Dependencia de Three.js r128 desde CDN

Funciona, pero es difícil de mantener: cualquier cambio toca todo el archivo y no hay separación de responsabilidades.

## Objetivo

Separar CSS y JS en archivos propios, dividir el JS en módulos ES6 por responsabilidad, sin cambiar gameplay, UI ni comandos. Mantener Three.js desde CDN. Cero build step.

## Estructura final

```
serviz/
├── server-simulator.html   # markup + link a styles.css y js/main.js
├── styles.css              # CSS extraído tal cual del <style> actual
├── js/
│   ├── main.js             # entry point (type="module")
│   ├── scene.js            # Three.js: scene, camera, renderer, buildScene, buildCabinet, animate
│   ├── terminal.js         # UI terminal: print, printPrompt, open, close, escapeHtml
│   ├── commands.js         # comandos Linux simulados + state (users, userGroups, sudoUsers, commandHistory)
│   ├── input.js            # teclado, mouse, pointerlock, getNearestServer
│   └── game.js             # state global (objectives, gameStarted, terminalOpen, currentServer), checkObjective, updateObjectives, startGame
├── docs/superpowers/specs/ # este archivo
└── (sin package.json, sin bundler)
```

## Arquitectura

### Dependencias entre módulos

```
main.js
  ├── game.js
  │     ├── scene.js
  │     ├── terminal.js
  │     │     └── game.js (state, checkObjective)
  │     ├── commands.js
  │     │     ├── terminal.js (print, printPrompt, closeTerminal)
  │     │     └── game.js (checkObjective)
  │     └── input.js
  │           ├── scene.js (camera, cabinetMeshes)
  │           ├── terminal.js (openTerminal, closeTerminal)
  │           └── game.js (state)
  └── (arranca con startGame de game.js)
```

Hay ciclos lógicos entre `game.js`, `terminal.js` y `commands.js` (todos comparten state). Se resuelven con **getters de state** exportados desde `game.js` en lugar de globals sueltos: `getState()`, `getUsers()`, `getSudoUsers()`, `setUser(name)`, `removeUser(name)`, `addSudoUser(name)`.

### Responsabilidades por módulo

**`js/main.js`** — Entry point. Importa `startGame` de `game.js` y lo invoca al cargar el DOM. Define listeners del botón "Iniciar" del overlay `#click-to-start`.

**`js/scene.js`** — Encapsula Three.js. Exporta:
- `getContext()` → `{ scene, camera, renderer, cabinetMeshes }` (creado lazy al primer `buildScene()`)
- `buildScene()` — construye piso, techo, paredes, luces, gabinetes (idéntico al actual)
- `buildCabinet(data)` — construye un gabinete (idéntico al actual)
- `animate()` — loop de render + movement + detección de servidor cercano + flicker de LEDs (idéntico al actual)
- `getNearestServer()` — calcula el gabinete más cercano a la cámara

**`js/terminal.js`** — UI pura de la terminal. Exporta:
- `print(text, cls)` — append de línea al body de la terminal
- `printPrompt(cmd)` — pinta el prompt con el comando (usa `escapeHtml`)
- `openTerminal(serverMesh)` — muestra terminal, actualiza título y prompt, imprime bienvenida
- `closeTerminal()` — oculta terminal, devuelve pointer lock al canvas
- `escapeHtml(s)` — escapa para evitar XSS
- `setupTerminalInput()` — listener de keydown en `#terminal-input` (Enter, ArrowUp/Down, Escape)

**`js/commands.js`** — Lógica de comandos. Exporta:
- `processCommand(raw)` — dispatcher idéntico al actual
- `getUsers()`, `getSudoUsers()` — getters
- `setUser(name)`, `removeUser(name)`, `addSudoUser(name)` — mutadores

Estado interno privado: `users`, `userGroups`, `sudoUsers`, `commandHistory`, `historyIndex`. Funciones auxiliares como `helpText` quedan internas.

**`js/input.js`** — Input global. Exporta:
- `setupInput()` — registra listeners de `keydown`, `keyup`, `mousemove`, `pointerlockchange`, `click` en canvas, `click` en overlay

**`js/game.js`** — State global y ciclo de vida. Exporta:
- `getState()` → `{ gameStarted, terminalOpen, currentServer, isLocked }`
- `setState(patch)` — merge parcial
- `getObjectives()` → objeto de objetivos
- `checkObjective(key)` — marca objetivo cumplido y refresca UI
- `updateObjectives()` — sincroniza UI con estado de objetivos
- `startGame()` — oculta overlay, llama `buildScene()`, `animate()`, pide pointer lock
- Constantes: `INTERACT_DISTANCE = 3.5`, `MAX_DELTA = 0.05`, `MOVE_SPEED = 5`, `BOUNDS = 18`, `CAMERA_HEIGHT = 1.7`

## Decisiones técnicas

1. **Módulos ES6 nativos** (`<script type="module">` en el HTML). Sin build step, sin bundler, sin npm.
2. **Three.js desde CDN** se mantiene (`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`) cargado en el HTML antes de `main.js`, ya que los módulos pueden acceder a globals de scripts previos cargados sin `type="module"`.
3. **State compartido vía getters** para evitar globals tipo `window.users` o `window.objectives`. Cada módulo pide solo lo que necesita vía funciones exportadas.
4. **DOM refs cacheadas** en cada módulo al primer uso (lazy), no en un módulo "dom.js" — overkill para 5 elementos que toca cada uno.
5. **`escapeHtml` se preserva** — ya existe y se usa correctamente al pintar comandos del usuario.
6. **CSS extraído literal** — sin refactor de selectores ni adopción de variables CSS. Mantener alcance.
7. **Listeners sin namespace** — sigue el patrón actual, sin `addEventListener` namespaced porque el proyecto es chico.

## Cambios en el HTML

- `<style>` → reemplazado por `<link rel="stylesheet" href="styles.css">`
- `<script src="...three..."></script>` se mantiene, sin `type="module"`, para exponer `THREE` como global
- `<script>...código actual...</script>` → reemplazado por `<script type="module" src="js/main.js"></script>`
- `onclick="startGame()"` y `onclick="closeTerminal()"` en atributos HTML → se reemplazan por listeners en `main.js` para evitar globals

## Flujo de datos

1. Usuario carga `server-simulator.html` → ve overlay `#click-to-start`
2. Click en "Iniciar" → `main.js` listener llama `startGame()` de `game.js`
3. `startGame` oculta overlay, llama `buildScene()` de `scene.js`, `animate()` de `scene.js`, pide pointer lock
4. `animate` lee `keys` (manejado por `input.js`) y mueve la cámara; cada frame consulta `getNearestServer()` para mostrar el hint interactivo
5. Usuario presiona `E` cerca de un gabinete → `input.js` llama `openTerminal(serverMesh)` de `terminal.js`
6. `openTerminal` muestra terminal, actualiza título, pide focus al input
7. Usuario escribe y presiona Enter → listener en `terminal.js` lee valor, llama `processCommand(cmd)` de `commands.js`
8. `processCommand` muta state vía setters de `commands.js`, llama `print()` para output, y `checkObjective()` de `game.js` si aplica
9. `checkObjective` actualiza state de objetivos y llama `updateObjectives()` que sincroniza el DOM
10. Usuario presiona Escape → `closeTerminal()` restaura el pointer lock

## Manejo de errores

- **Usuario tipea comando inválido** → `print(..., 'error')` con mensaje. Ya implementado, se mantiene.
- **Tres.js no carga (CDN caído)** → `THREE` undefined, el script falla con error visible en consola. No se agrega manejo defensivo (YAGNI).
- **DOM elements faltantes** → `document.getElementById(...)` retorna `null` y falla al usar. Se mantiene el contrato de IDs exactos del HTML actual.
- **Módulo no se carga** → el navegador muestra error en consola y el juego no arranca. Esperado en desarrollo.

## Testing

Alcance acotado: solo tests unitarios para `commands.js` (lógica pura de usuarios), que es lo único testeable sin DOM ni Three.js.

- `js/commands.js` se importa en un test runner simple (Node con `node:test` o Vitest si se agrega después)
- Casos mínimos: `useradd` crea y rechaza duplicados, `userdel` elimina y rechaza root, `usermod -aG sudo` agrega y dispara objetivo, validaciones de regex
- **Sin tests** para scene.js, terminal.js, input.js, game.js (requerirían mocks de DOM y Three.js, fuera de alcance)

Si el usuario quiere tests en otra capa después, se puede agregar.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Módulos ES6 no funcionan con `file://` | Documentar al final: servir con `python3 -m http.server` o cualquier static server |
| Ciclos de import entre módulos | Resuelto con getters de state en `game.js` (no hay imports circulares) |
| `THREE` global no accesible desde módulos con `type="module"` | Cargar Three.js como script clásico (sin `type="module"`) en el HTML antes de `main.js` |
| Cambio accidental de comportamiento | Refactor literal: el código se mueve, no se reescribe. Diff debe ser mayormente cortes/pegs |
| `onclick` inline atributos requieren globals | Reemplazar por `addEventListener` en `main.js` |

## Out of scope (no se hace)

- Refactor de CSS a variables / BEM / Tailwind
- Bundler, TypeScript, npm, package.json
- Tests de integración / visuales
- Accesibilidad (roles ARIA, focus management, contraste)
- Deploy / hosting
- Nuevas features o comandos

## Criterios de éxito

- [ ] `server-simulator.html` solo tiene markup y `<link>`/`<script>` tags
- [ ] `styles.css` contiene todo el CSS que estaba inline
- [ ] 6 archivos JS en `js/` con responsabilidades claras
- [ ] El juego carga y funciona idéntico a la versión actual cuando se sirve por HTTP
- [ ] Consola del navegador sin errores ni warnings nuevos
- [ ] Sin `Co-Authored-By` ni atribución de IA en commits
