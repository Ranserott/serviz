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

---

# Server Simulator — Feature: Modelos GLB y puerta con PIN

**Fecha:** 2026-06-12
**Alcance:** reemplazar los gabinetes procedurales por un modelo GLB (`model/servidor.glb`), spawnear la cámara afuera de la sala y agregar un gate de PIN para entrar.

## Contexto

Después del refactor, el juego tiene gabinetes generados con código (cubos apilados, LEDs como puntos). El usuario tiene un modelo `.glb` que quiere usar para verse "más realista", y quiere que el juego tenga una mecánica de entrada: arrancar afuera de la sala, poner un PIN en una puerta, y solo entonces poder entrar a interactuar con los gabinetes.

Esto agrega un loop de gameplay nuevo: la sala es ahora un espacio con acceso restringido.

## Objetivos

1. Reemplazar la geometría procedural de los gabinetes por instancias del modelo `model/servidor.glb`
2. Spawnear al jugador en un pasillo exterior, mirando a una puerta
3. Gate de PIN: el jugador tiene que tipear el PIN correcto en una UI overlay para que la puerta se abra
4. Una vez adentro, el flujo original (acercarse al gabinete, presionar E, terminal) sigue funcionando idéntico

## No-objetivos

- No agregar animaciones de apertura/cierre de puerta (solo color + posición)
- No agregar sonidos
- No agregar más niveles o salas
- No cambiar la lógica de comandos ni los objetivos
- No mover la posición de los gabinetes ni cambiar serverData

## Assets

- `model/servidor.glb` — modelo 3D, ~750KB, glTF 2.0 binary, generado con trimesh. Estructura: 1 scene, 2 nodes (`world` → `geometry_0`), 1 mesh, 1 material. Sin texturas, sin animaciones.
- Se carga con `GLTFLoader` desde `three/addons/loaders/GLTFLoader.js` (CDN jsdelivr, Three.js r128)
- Se instancia 4 veces en las mismas posiciones que los gabinetes actuales

## Nuevos requisitos de HTML

- `<script type="importmap">` que mapee `three` y `three/addons/` a URLs del CDN
- Mantener `<script src="...three.min.js">` como antes (para que `THREE` siga siendo global)
- `<script type="module" src="js/main.js">` igual que antes
- Markup nuevo para el overlay de PIN:
  - `#pin-overlay` (oculto al inicio)
  - `#pin-display` (muestra `_ _ _ _` o los dígitos tipeados)
  - `.pin-key` (12 botones: 0-9, borrar, enter)
  - `#pin-message` (errores / éxito)

## Nuevos requisitos de CSS

- Estilos para `#pin-overlay` (overlay centrado, fondo semi-transparente, panel con display + teclado)
- Estilos para `.pin-key` (botones grandes, con efecto hover/active)
- Estilos para `.pin-key.error` (shake animation al PIN incorrecto)
- Estilos para `.pin-key.success` (flash verde al PIN correcto)
- Mantener todo el CSS existente intacto

## Cambios en scene.js

- Agregar función `loadServerModel()` que carga el GLB con GLTFLoader
  - Retorna una `Promise<THREE.Group>` con el modelo cargado
- Reemplazar `buildCabinet(data)` con `instantiateCabinet(data, modelTemplate)` que:
  - Clona el template del GLB
  - Lo posiciona en `data.pos`
  - Setea `userData = { serverId, serverName, interactive: true }`
  - Agrega un `PointLight` como `userData.glowLight` (mantener el flicker)
- Agregar función `buildDoorAndWall()` que construye:
  - Una pared con hueco en el medio, en `z=18` (largo x=20, alto y=5, profundidad z=0.3)
  - El hueco está centrado en x=0, ancho=2.5, alto=3.5
  - Una "puerta" (caja 2.5x3.5x0.3) inicialmente en la posición del hueco, color rojo oscuro
  - Cuando el PIN es correcto, la puerta se mueve a `x=-12` (corre hacia el costado) y cambia a verde
  - `userData = { isDoor: true }` para que el game loop la pueda detectar
- Modificar `buildScene()` para:
  - Esperar a que `loadServerModel()` resuelva antes de instanciar gabinetes
  - Agregar la pared y la puerta
  - Retornar una `Promise` (porque la carga del GLB es async)
- Exportar `getDoor()` para que game.js pueda animar la puerta

## Cambios en game.js

- Nuevo state: `inside: false` (inicia afuera), `pinInput: ''` (string vacío)
- Constante nueva: `PIN_CODE = '1234'`, `PIN_LENGTH = 4`
- Constante: `OUTSIDE_Z = 18` (la puerta está acá)
- Modificar `startGame()`:
  - Camera spawn en `(0, 1.7, 22)` (afuera)
  - Camera mira hacia -Z (la dirección default ya es -Z, así que no se rota)
  - `buildScene()` ahora retorna Promise → `await buildScene()` o `.then(animate)`
- Modificar `updateMovement()`:
  - Si `!state.inside`, clampar `camera.position.z >= 19` (no podés cruzar la puerta cerrada)
  - Si `state.inside`, bounds normales (±18)
- Modificar `updateInteractionHints()`:
  - Si `!state.inside`, mostrar hint "Acércate a la puerta y tipea el PIN" + mostrar el `#pin-overlay` si dist < 3
  - Si `state.inside`, hint normal del gabinete más cercano
- Nueva función `tryEnterPin(input)`:
  - Compara con `PIN_CODE`
  - Si correcto: `state.inside = true`, oculta overlay, mensaje "PUERTA ABIERTA" en HUD, anima la puerta
  - Si incorrecto: agrega clase `.error` a `#pin-overlay` por 500ms (para shake), `state.pinInput = ''`
- Nueva función `addPinDigit(digit)`:
  - Si `state.pinInput.length < PIN_LENGTH`, agrega el dígito
  - Si llegó a PIN_LENGTH, llama `tryEnterPin(state.pinInput)`
- Nueva función `clearPinInput()`:
  - `state.pinInput = ''`
- Modificar `setupGame()`:
  - Wirear `setupPinUI({ onDigit, onClear, onSubmit })` (nuevo módulo `js/pin.js`)

## Nuevo módulo js/pin.js

- Exporta `setupPinUI({ onDigit, onClear, onSubmit })`:
  - Query selectors para los botones
  - Asocia `click` a cada `.pin-key` con `data-digit="X"` → llama `onDigit(X)`
  - Asocia el botón "borrar" → `onClear()`
  - Asocia el botón "enter" → `onSubmit()`
  - Asocia `keydown` global para teclas 0-9, Backspace, Enter cuando `state.pinOpen` es true
- Exporta `showPinOverlay()`, `hidePinOverlay()`, `setPinDisplay(value)`, `triggerError()`, `triggerSuccess()`:
  - Manipulan el DOM del overlay

## Cambios en input.js

- Agregar handler de teclado numérico cuando `isPinOpen()` retorna true:
  - 0-9 → `onPinDigit(digit)`
  - Backspace → `onPinClear()`
  - Enter → `onPinSubmit()`
  - Escape → `onPinClose()` (cierra el overlay sin submit)
- El handler actual de KeyE/Escape sigue funcionando cuando `isPinOpen()` es false

## Cambios en server-simulator.html

- Agregar el importmap antes de los scripts
- Agregar el markup del PIN overlay
- Mismo script de Three.js + module script (mismo orden)

## Cambios en main.js

- Importar `setupPinUI` desde `js/pin.js` y pasarlo a `setupGame`
- O `setupGame` puede importar `setupPinUI` directamente y hacer el wiring

## Estructura de archivos (actualizada)

```
serviz/
├── server-simulator.html    # 59 → ~85 líneas (markup + importmap + scripts + PIN overlay)
├── styles.css               # 148 → ~200 líneas (estilos del PIN overlay)
├── js/
│   ├── main.js              # 10 → ~14 líneas
│   ├── scene.js             # 169 → ~220 líneas (GLB + puerta)
│   ├── terminal.js          # 57 líneas (sin cambios)
│   ├── commands.js          # 193 líneas (sin cambios)
│   ├── input.js             # 37 → ~50 líneas (handler PIN)
│   ├── pin.js               # NUEVO, ~40 líneas
│   └── game.js              # 173 → ~220 líneas (state inside, tryEnterPin, etc.)
├── model/
│   └── servidor.glb         # 750KB, glTF 2.0
├── tests/
│   └── commands.test.js     # sin cambios
├── docs/superpowers/
│   ├── specs/
│   └── plans/
└── .gitignore
```

## Criterios de éxito

- [ ] El juego arranca con la cámara afuera de la sala, mirando a una puerta
- [ ] Acercarse a la puerta muestra el overlay de PIN
- [ ] Tipear `1234` + Enter abre la puerta (color verde + se corre al costado)
- [ ] Tipear cualquier otro PIN muestra error y shake
- [ ] Una vez abierta, la cámara puede cruzar a la sala
- [ ] Los 4 gabinetes ahora se ven con el modelo GLB en vez de cubos
- [ ] El flujo original (acercarse, E, terminal, comandos) sigue funcionando idéntico
- [ ] 8/8 tests siguen pasando
- [ ] Consola del navegador sin errores

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| GLB tiene escala o rotación inesperada | El plan incluye ajustar `scale` y `rotation` en la instanciación; si el modelo se ve muy chico o grande, ajustar empíricamente |
| GLB sin texturas se ve feo | Aceptamos — el material con lighting puede verse bien; si no, agregar material alternativo |
| Import map puede tener issues de CORS en algunos browsers | Probado en Chrome/Firefox/Safari modernos. Documentar como requisito. |
| El usuario tipea el PIN antes de que se cargue el GLB | El overlay del PIN solo aparece con la puerta, que es parte del scene. Bloquear el spawn hasta que `buildScene()` resuelva. |
| Door clip: pasar al lado de la puerta sin PIN | Los bounds de cámara clampean `z>=19` cuando `!inside`, así que no se puede cruzar |

## Out of scope

- Animación de la puerta abriéndose (slide, rotación)
- Sonido al abrir/cerrar
- PIN aleatorio o generado por servidor
- Segunda puerta o múltiples salas
- Cambio en objetivos del juego
