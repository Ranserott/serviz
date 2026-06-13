# Server Simulator — Audio y rediseño de gabinetes

**Fecha:** 2026-06-13
**Alcance:** agregar sistema de efectos de sonido sintetizados con Web Audio API, y reemplazar el modelo GLB de gabinetes por gabinetes procedurales de estilo industrial. Preservar 100% del gameplay loop actual.

## Contexto

El simulador funciona, pero le faltan dos cosas que bajan la inmersión:

1. **Sin audio.** Caminar, abrir la puerta, teclear comandos y los eventos del flujo de juego (PIN, level complete, terminal) son mudos. El jugador no tiene feedback auditivo.
2. **Gabinetes con GLB externo.** `js/scene.js` carga `model/servidor.glb` y lo clona 4 veces. El modelo no se ve bien (lo dice el usuario), y suma una dependencia externa a un proyecto que no tiene build step.

Lo demás de la escena (door, paredes, frame, ceiling lights, fog) se va a mantener en su mayoría, ajustando ambientación para que combine con el nuevo estilo industrial de los gabinetes.

## Objetivo

- **Audio**: efectos de sonido sintetizados con Web Audio API para los 3 eventos pedidos por el usuario (caminar, abrir puerta, teclear) + eventos importantes del flujo (PIN digit/success/error, level complete, terminal open/close). Módulo nuevo, sin archivos de audio, sin dependencias externas.
- **3D**: gabinetes procedurales de estilo industrial (gris metálico, ventilación, mini display LCD, LEDs de status), diferenciados por color de acento según su tipo (Web/DB/App/Backup). Ambientación general de la escena ajustada al nuevo estilo (luces funcionales, cables ethernet, paredes gris-metal, fog gris claro).
- **Mute toggle** en el HUD con persistencia en `localStorage`.
- **Preservar gameplay**: la lógica de juego, el flujo de niveles, los objetivos, el PIN flow, la interacción con cabinets, y los 14 tests existentes de `tests/commands.test.js` deben seguir pasando sin modificación.

## Decisiones de diseño (resumen del brainstorming)

| Decisión | Elección | Razón |
|----------|----------|-------|
| Alcance 3D | Gabinetes + ambientación | El usuario lo pidió así; el resto de la escena se ajusta para coherencia |
| Estilo visual de gabinetes | Industrial realista (gris metálico, ventilación, LCD) | Lo que el usuario eligió en el mockup visual |
| Ambientación | Industrial coherente (luces funcionales blancas/azules, paredes gris-metal, fog gris claro) | Para que combine con los gabinetes sin choque visual |
| Diferenciación de gabinetes | 4 colores de acento: Web=azul, DB=verde, App=naranja, Backup=violeta | Para que el jugador identifique cada tipo de un vistazo |
| Fuente de audio | Web Audio API sintetizado (osciladores, noise, envelope) | Cero peso, cero dependencias, sin licencias, look "retro-sintético" que encaja con el juego |
| Eventos de audio | 3 pedidos + flujo (PIN, level, terminal) | Cubre la experiencia de cabo a rabo sin ser overkill |
| Approach de implementación | Mínimo viable: 1 módulo nuevo, 1 modificado mayormente | El proyecto es chico, refactor agresivo no aporta |

## Estructura final

```
serviz/
├── server-simulator.html   # markup modificado: + botón mute en HUD
├── styles.css              # estilos del botón mute
├── js/
│   ├── main.js             # entry point — sin cambios
│   ├── three-bootstrap.js  # THREE global — sin cambios
│   ├── scene.js            # 🔧 modificado: reescritura de buildProceduralCabinet, ambientación, eliminar loadServerModel
│   ├── terminal.js         # 🔧 modificado: + playTyping() en keydown
│   ├── pin.js              # 🔧 modificado: + playPinDigit/Success/Error
│   ├── input.js            # sin cambios
│   ├── commands.js         # sin cambios
│   ├── game.js             # 🔧 modificado: + playFootstep, + playDoorOpen, + playLevelComplete, + reset audio en startGame
│   └── audio.js            # 🆕 nuevo: Web Audio API, masterGain, mute, throttling
├── tests/
│   └── commands.test.js    # sin cambios
├── docs/superpowers/specs/ # este archivo
└── model/                  # ⚠️ directorio queda vacío, listo para borrar en commit de cleanup
```

## Arquitectura

### Dependencias entre módulos (cambios marcados con *)

```
main.js
  └─ game.js
       ├─ three-bootstrap.js
       ├─ scene.js
       ├─ terminal.js ─→ audio.js* (typing)
       ├─ pin.js ─→ audio.js* (PIN digit/success/error)
       ├─ commands.js
       └─ input.js
       └─ audio.js* (footsteps, door, level complete, unlock)
```

`audio.js` no importa nada del proyecto. Es standalone. Todos los otros módulos lo importan para reproducir sonidos en hooks específicos.

## Componente: `js/audio.js` (nuevo)

### API pública

```js
// Inicialización (llamar en el primer user gesture)
export function unlockAudio(): void

// Mute toggle
export function setMuted(m: boolean): void
export function isMuted(): boolean

// Efectos de sonido
export function playFootstep(): void
export function playDoorOpen(): void
export function playTyping(): void
export function playPinDigit(): void
export function playPinSuccess(): void
export function playPinError(): void
export function playLevelComplete(): void
export function playTerminalOpen(): void
export function playTerminalClose(): void
```

### Implementación interna

- **AudioContext lazy**: se crea en el primer `unlockAudio()`. Los browsers modernos requieren un user gesture (click, keydown) para activar el contexto. `unlockAudio` se llama desde `startGame()` en `game.js`, después del click en "INICIAR".
- **Master gain**: un solo nodo `GainNode` con valor 0.3, conectado a `destination`. Todas las fuentes pasan por él. El mute toggle cambia `masterGain.gain.value` a 0 o 0.3, no desconecta el grafo.
- **Mute state**: una variable `muted` que las funciones consultan al inicio y retornan early sin tocar el contexto (más eficiente que enrutar a 0).
- **Persistencia**: el estado de mute se guarda en `localStorage` con key `serviz-muted`. Se lee en la inicialización de `audio.js`.

### Diseño de cada sonido (forma, no frecuencia exacta)

| Función | Técnica | Notas |
|---------|---------|-------|
| `playFootstep` | Ruido blanco → highpass filter 800Hz → envelope rápido (attack 5ms, decay 80ms). 2 variaciones de frecuencia de filtro alternadas | Throttle interno: mínimo 280ms entre llamadas para no saturar al caminar contra una pared |
| `playDoorOpen` | Oscilador sawtooth → sweep de frecuencia 200Hz→600Hz en 600ms → envelope (attack 50ms, decay 550ms) → lowpass 1500Hz | Sonido "mecánico deslizando" |
| `playTyping` | Ruido blanco → bandpass 2000Hz Q=2 → envelope (attack 1ms, decay 40ms) | Throttle 60ms. Clic seco, no resonante |
| `playPinDigit` | Sine 1000Hz, duración 50ms, envelope rápido | Beep agudo corto, no agresivo |
| `playPinSuccess` | 2 sines: 880Hz (A5) + 1318Hz (E6), 150ms cada uno con 30ms overlap, envelope decay | Arpegio alegre corto |
| `playPinError` | Sawtooth 150Hz + square 145Hz (detune), envelope descendente 250ms | Sonido grave de "denegado" |
| `playLevelComplete` | 4 sines en arpegio ascendente: C5(523), E5(659), G5(784), C6(1047), 120ms cada una con overlap 30ms, envelope decay | Arpegio de fanfarria |
| `playTerminalOpen` | Sine 800Hz → 400Hz en 150ms, envelope decay | "Boop" descendente |
| `playTerminalClose` | Sine 400Hz → 800Hz en 150ms, envelope decay | "Boop" ascendente |

### Decisiones de diseño del audio

- **Volumen global conservador (0.3)**: los sonidos WebAudio suenan fuertes, mejor bajo. Si el usuario lo quiere más fuerte, es 1 línea de cambio.
- **Throttling en footsteps y typing**: sin esto, caminar contra una pared o copy-paste en la terminal genera un muro de sonido刺耳.
- **Sin archivos, sin licencias, sin peso extra**: todos los sonidos se generan en runtime. El proyecto sigue siendo 100% portable, sin assets externos más allá del GLB que se va a eliminar.
- **Funciones standalone, no un dispatcher**: cada efecto es su propia función exportada, en vez de un `play(type)`. Es marginalmente más verbose pero mucho más testeable y descubrible.

## Componente: gabinetes industriales (`js/scene.js` modificado)

### Cambio de firma

`buildProceduralCabinet(data)` → `buildProceduralCabinet(data, accentColor)`

El `accentColor` se deriva del `serverData.id` mediante una función helper local:

```js
const ACCENT_BY_ID = {
  'server-01': 0x4a9eff, // Web - azul
  'server-02': 0x4ade80, // DB - verde
  'server-03': 0xff9a3c, // App - naranja
  'server-04': 0xa78bfa  // Backup - violeta
};
```

### Geometría del gabinete

Tamaño total: ~1.4 ancho × 4 alto × 1 profundo (igual que el actual, para no romper el layout de la escena). Componentes (todos con `MeshStandardMaterial` para tener PBR correcto, o `MeshLambertMaterial` si la performance es preocupación):

| Parte | Geometría | Material | Color |
|-------|-----------|----------|-------|
| Cuerpo principal | `BoxGeometry(1.4, 4, 1)` | `MeshLambertMaterial` (consistente con el resto del proyecto) | `#3a3a3a` (gris metálico) |
| Panel frontal superior (donde va el LCD) | `BoxGeometry(1.2, 0.4, 0.05)` | `MeshLambertMaterial` | `#1a1a1a` (más oscuro) |
| LCD display | `PlaneGeometry(0.5, 0.2)` con textura procedural (Canvas 2D) | `MeshBasicMaterial` | texto verde LCD |
| Rejilla de ventilación central | patrón repetido de `BoxGeometry` finos (5-6 filas × 6-8 cols) | `MeshLambertMaterial` | `#222222` |
| 2 LED de status | `SphereGeometry(0.05)` | `MeshBasicMaterial` | `accentColor` |
| PointLight por LED | `PointLight(accentColor, 0.8, 4)` | — | — |
| Logo "SERVER" en la base | textura canvas con texto "SRV-XX" | `MeshBasicMaterial` | gris claro sobre oscuro |
| ID lateral | texto vertical en canvas,贴在 lateral | — | acento |

### LCD display

Textura procedural generada con `Canvas2D` API:
- Canvas 256x128
- Fondo `#0a0a0a`
- Texto en verde fosforescente `#88ff88`, fuente monospace
- Contenido: `${serverName.toUpperCase().slice(0,2)}-0${id.slice(-1)} OK` (ej: "WE-01 OK", "DB-02 OK")
- Padding 8px

### Mapeo de servidores

| ID | serverName | accentColor | LCD text |
|----|------------|-------------|----------|
| server-01 | Web | `0x4a9eff` (azul) | `WE-01 OK` |
| server-02 | DB | `0x4ade80` (verde) | `DB-02 OK` |
| server-03 | App | `0xff9a3c` (naranja) | `AP-03 OK` |
| server-04 | Backup | `0xa78bfa` (violeta) | `BA-04 OK` |

## Componente: ambientación industrial (`js/scene.js` modificado)

### Cambios concretos en `buildScene`

| Elemento | Antes | Ahora |
|----------|-------|-------|
| `scene.background` | `0x050a08` (verde-neón oscuro) | `0x1a1f1c` (gris-verdoso muy oscuro) |
| `scene.fog` | `0x050a08, 35, 90` | `0x1a1f1c, 30, 85` (un toque más cerrado) |
| Floor material | `0x0a1a0f` (verde oscuro) | `0x1a1a1a` (gris oscuro) |
| GridHelper colors | `0x0d2b15` | `0x333333` |
| Ceiling material | `0x060d09` | `0x0a0a0a` |
| Wall material | `0x070f0a` (verde oscuro) | `0x2a2d2a` (gris medio) |
| AmbientLight | `0x445544, 1.2` (tinte verde) | `0x888888, 1.0` (gris neutro) |
| HemisphereLight | sky `0x88ffaa`, ground `0x222211` | sky `0xaabbcc`, ground `0x333333` |
| DirectionalLight | `0xffffff, 0.6` | `0xffffff, 0.5` (un toque menos) |
| Tiras de techo | `PointLight(0x00ff88)` + box verde neón | `PointLight(0xaabbcc)` tenue + box blanco azulado |
| Cables del piso | 6 cilindros de colores (verde, azul, rojo, amarillo) | 6 cilindros en grises/negros realistas (`#222`, `#333`, `#444`) |
| Door material | `0x4a0a0a` | igual (ya es coherente) |
| Wall door (top) | `0x070f0a` | `0x2a2d2a` (igual que paredes) |
| Frame | `0x1a2e1f` | `0x3a3a3a` (gris metálico, igual que gabinetes) |

### Lo que NO cambia

- `buildDoorAndWall()`: la estructura geométrica (doorway, frame) se mantiene. Solo cambian los colores de los materiales.
- Posición y tamaño de los cabinets (siguen en `[-6, 0, -4]`, `[6, 0, -4]`, etc.)
- Rotación de los cabinets: 180° (siguen mirando a la entrada)
- Animación de LEDs: `updateLedFlicker()` en `game.js` se mantiene, ahora con el color de acento del cabinet
- `getNearestServer()`: sin cambios, sigue calculando distancia a `cabinetMeshes`
- `getCamera()`, `renderFrame()`, `resize()`: sin cambios

## Hooks de audio

Tabla de dónde se llama cada función:

| Evento | Archivo | Función | Hook exacto |
|--------|---------|---------|-------------|
| Unlock audio | `js/game.js` | `unlockAudio()` | Al inicio de `startGame()`, después de ocultar el overlay de inicio |
| Caminar | `js/game.js` | `playFootstep()` | Dentro de `updateMovement(dt)`, cuando `moveDir.length() > 0` y `state.isLocked` |
| Abrir puerta | `js/game.js` | `playDoorOpen()` | Dentro de `openDoor()`, antes del `door.userData.open = true` |
| Level complete | `js/game.js` | `playLevelComplete()` | Dentro de `onLevelComplete()`, en el `setTimeout` del primer bloque |
| Teclear comando | `js/terminal.js` | `playTyping()` | Dentro de `setupTerminalInput` keydown, antes de `onSubmit(cmd)` |
| Terminal open | `js/terminal.js` | `playTerminalOpen()` | Al final de `openTerminal(server)` |
| Terminal close | `js/terminal.js` | `playTerminalClose()` | Al inicio de `closeTerminal()` |
| PIN digit click | `js/pin.js` | `playPinDigit()` | Dentro de `setupPinUI` onclick, cuando `digit !== undefined` |
| PIN success | `js/pin.js` | `playPinSuccess()` | Dentro de `triggerSuccess()` |
| PIN error | `js/pin.js` | `playPinError()` | Dentro de `triggerError()` |
| Reset audio state | `js/game.js` | (no hay función específica, `state.pinInput = ''` y reset ya están) | Dentro de `startGame()` |

## Mute toggle

### UI

- Botón en el HUD, esquina superior derecha
- Icono SVG inline (no imagen): altavoz con onda cuando no está muteado, altavoz con X cuando sí
- Tamaño: 24x24px, fondo semi-transparente, hover más opaco

### Comportamiento

- Click → `setMuted(!isMuted())` → actualiza el icono
- Estado persiste en `localStorage` con key `serviz-muted`
- En la inicialización de `audio.js`, se lee de `localStorage` y se aplica
- Si el contexto de audio no se inicializó todavía (no hubo user gesture), `setMuted` solo actualiza la variable y el localStorage — el cambio aplica cuando se desbloquee el audio

## Constraints e invariantes

**Lo que NO se puede romper:**

1. Los 14 tests de `tests/commands.test.js` deben seguir pasando sin modificación
2. El flujo de juego completo: PIN → entrar → caminar a cabinets → abrir terminal → escribir comandos → completar objetivos → level complete → siguiente nivel
3. La interacción con cabinets: `getNearestServer()` debe seguir funcionando, el raycast improvisado con `INTERACT_DISTANCE` se mantiene
4. La función `checkObjective(key)` debe seguir recibiendo la key correcta (esto ya se arregló en el commit anterior, no se vuelve a tocar)
5. `escapeHtml()` y la XSS protection de `print()` en `terminal.js` se mantienen
6. El `importmap` de Three.js r128 desde CDN no se toca
7. `three-bootstrap.js` no se toca (THREE como window global sigue funcionando)

**Lo que sí se puede cambiar:**

- Estructura interna de `scene.js` (reescritura de `buildProceduralCabinet`, ambientación)
- Cualquier parte de `game.js` que no afecte el gameplay loop
- Estilos CSS (solo para agregar el botón mute)
- Markup HTML (solo para agregar el botón mute)

## Testing

### Tests automatizados

- **`tests/commands.test.js`**: los 14 tests existentes. Deben seguir pasando sin cambios. Verificar con `node --test tests/commands.test.js` antes de commitear.
- **No se agregan tests automatizados para audio** porque no hay forma significativa de testear Web Audio sin un browser. Lo que sí se puede asegurar es que las funciones sean puras (no side effects más allá del AudioContext) y que el throttle funcione como se espera — eso se valida con inspección de código.
- **No se agregan tests automatizados para la geometría 3D** porque no hay forma de testear Three.js sin un browser. La verificación es visual.

### Verificación manual (checklist)

Antes de declarar la implementación completa, en el browser:

1. [ ] Cargar `http://localhost:8000/server-simulator.html` (el server Python ya está corriendo en background)
2. [ ] Click "INICIAR" → la escena 3D aparece, sin gabinete GLB visible
3. [ ] Los 4 gabinetes se ven: azul (Web), verde (DB), naranja (App), violeta (Backup)
4. [ ] Caminar (WASD) → se escucha el sonido de pasos (con throttle, no saturado)
5. [ ] Acercarse a la puerta → aparece el PIN overlay
6. [ ] Tipear PIN incorrecto → se escucha el "error" + animación visual
7. [ ] Tipear PIN correcto (1234) → se escucha "success" + la puerta abre (con sonido de barrido) + se puede entrar
8. [ ] Acercarse a un gabinete → aparece el hint "[E] para acceder"
9. [ ] Presionar E → se abre la terminal, se escucha "boop descendente"
10. [ ] Escribir un comando → se escucha "click" de typing (throttleado)
11. [ ] Completar todos los objetivos del nivel → se escucha el arpegio de level complete
12. [ ] Cerrar la terminal (ESC o click en overlay) → se escucha "boop ascendente"
13. [ ] Mute toggle: click en el botón del HUD → todos los sonidos se silencian, el icono cambia
14. [ ] Refresh del browser → el estado de mute persiste
15. [ ] No hay errores en la consola del browser
16. [ ] Los 4 gabinetes tienen la ambientación industrial coherente (luces blancas/azules, fog gris, paredes gris-metal)

## Riesgos y consideraciones

- **Performance**: 4 gabinetes con MeshStandardMaterial + PointLights + texturas canvas podrían ser pesados. Mitigación: usar MeshLambertMaterial si la performance es problema, o `MeshPhongMaterial` como punto medio. La animación de LEDs (`updateLedFlicker`) sigue funcionando igual.
- **Browser autoplay policy**: el `AudioContext` no se puede inicializar sin user gesture. Por eso `unlockAudio()` se llama en `startGame()`. Si el usuario recarga la página sin hacer click en "INICIAR", no hay audio. Esto es estándar y aceptable.
- **Memory leak del AudioContext**: si el usuario hace refresh constante, podría haber acumulación. Mitigación: en `startGame()` no se crea un nuevo contexto, se reusa el existente. Si el contexto está en estado `suspended`, se resume.
- **Textura canvas y memory**: el LCD display usa una textura generada con canvas. Si en el futuro se quiere texto dinámico, hay que regenerar la textura. Por ahora, texto estático se genera una vez y se reusa.
- **Mobile**: el juego usa pointerlock, que no funciona en mobile. Asumimos desktop. No hay cambios acá.
- **Cleanup del GLB**: el archivo `model/servidor.glb` y el directorio `model/` se eliminan en el mismo commit final de cleanup. No se deja dead file.

## Lo que queda fuera de scope

- Persistencia de progreso entre sesiones (más allá del mute)
- Más efectos de sonido (ambient de data center, música de fondo, etc.)
- Refactor de `scene.js` en múltiples archivos (decidido mantenerlo monolítico por ahora)
- Version mobile del juego
- Internacionalización (todo el texto sigue en español)
