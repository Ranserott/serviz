// js/three-bootstrap.js — expose Three.js as a window global
//
// Why: scene.js, game.js, etc. use the THREE global (THREE.Scene, THREE.Vector3, ...)
// because we don't have a bundler. three.module.js is an ES module and does NOT
// define window.THREE on its own. This module imports three as ESM, then assigns
// it to window.THREE so the rest of the app can use it.
//
// It must be the first import in main.js so window.THREE exists before scene.js
// evaluates (ES module imports are hoisted and evaluated before the importing
// module's top-level code).

import * as THREE from 'three';
window.THREE = THREE;
