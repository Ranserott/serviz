# Server Config Simulator

Simulador 3D de administración de servidores Linux construido con Three.js. El jugador se mueve por un data center, se acerca a gabinetes con cerradura, ingresa un PIN, abre terminales Linux simuladas y completa misiones de administración (crear usuarios, asignar grupos, configurar red, etc.) en 7 niveles progresivos.

## Features

- Escena 3D en primera persona con controles WASD + mouse (pointer lock)
- 4 gabinetes procedurales con estilo industrial, cada uno con un color de acento distinto (Web, DB, App, Backup) y un mini display LCD
- 7 niveles con 28 objetivos de aprendizaje de Linux (básico, gestión de usuarios, redes, procesos, almacenamiento, seguridad)
- Terminal Linux simulada con 30+ comandos funcionales (`useradd`, `usermod`, `passwd`, `chmod`, `ps`, `ifconfig`, etc.)
- Sistema de efectos de sonido sintetizados con Web Audio API (sin archivos, todo generado en runtime)
- Mute toggle con persistencia en `localStorage`

## Stack

- Three.js r128 (ES modules desde CDN via importmap)
- JavaScript ES6 modules — sin bundler, sin build step
- HTML + CSS vanilla
- Node `node:test` para tests unitarios (sólo la lógica de comandos)

## Quick start

```sh
# Desde la raíz del proyecto
python3 -m http.server 8000
# Abrí http://localhost:8000/server-simulator.html en el browser
```

El proyecto no tiene dependencias de npm. Todo el JavaScript se sirve directamente como módulos ES6.

## Controles

| Tecla | Acción |
|-------|--------|
| `W` `A` `S` `D` o flechas | Moverse |
| Mouse | Mirar |
| `E` | Interactuar con el gabinete más cercano |
| `Esc` | Salir de la terminal o liberar el mouse |
| `M` | Mute / unmute audio |

## PIN

El PIN para abrir la puerta del data center es `1234`. Está hardcodeado en `js/game.js` (constante `PIN_CODE`) para que el juego sea accesible sin configuración.

## Estructura del proyecto

```
serviz/
├── server-simulator.html        # markup, importmap, botón mute
├── styles.css                   # estilos del HUD, terminal, PIN, mute
├── js/
│   ├── main.js                  # entry point + handler del mute
│   ├── three-bootstrap.js       # expone THREE como window global
│   ├── scene.js                 # escena 3D, gabinetes, door/wall, ambientación
│   ├── game.js                  # state global, animate loop, hooks de audio
│   ├── terminal.js              # UI de la terminal, hooks de audio
│   ├── pin.js                   # overlay del PIN, hooks de audio
│   ├── input.js                 # teclado, mouse, pointer lock
│   ├── commands.js              # comandos Linux simulados + state
│   └── audio.js                 # Web Audio API, 9 efectos sintetizados
├── tests/
│   └── commands.test.js         # 14 tests de la lógica de comandos
└── docs/superpowers/specs/      # specs de diseño histórico
```

## Tests

```sh
node --test tests/commands.test.js
```

Cubre la lógica de gestión de usuarios (crear, eliminar, agregar a sudo, validar usernames, reset de state). 14 tests, todos passing.

## Audio

Los efectos de sonido están en `js/audio.js` y se generan con osciladores, ruido blanco y envelopes — sin archivos de audio, sin dependencias externas. Funciones disponibles:

- `playFootstep`, `playDoorOpen`, `playTyping`
- `playPinDigit`, `playPinSuccess`, `playPinError`
- `playLevelComplete`, `playTerminalOpen`, `playTerminalClose`

`footstep` y `typing` tienen throttling interno (280ms y 60ms respectivamente) para evitar saturación al caminar contra una pared o al copy-paste.

## Diseño

Los specs de diseño están en `docs/superpowers/specs/`. Los cambios grandes del proyecto pasan por brainstorming + spec antes de implementación.
