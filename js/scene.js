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
