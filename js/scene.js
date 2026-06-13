// js/scene.js — Three.js scene, industrial procedural cabinets, door and wall, render helpers

import './three-bootstrap.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

scene.background = new THREE.Color(0x1a1f1c);
scene.fog = new THREE.Fog(0x1a1f1c, 30, 85);
camera.position.set(0, 1.7, 22);

const cabinetMeshes = [];
let doorMesh = null;

const serverData = [
  { id: 'server-01', name: 'Web Server',    pos: [-6, 0, -4] },
  { id: 'server-02', name: 'DB Server',     pos: [6,  0, -4] },
  { id: 'server-03', name: 'App Server',    pos: [-6, 0,  4] },
  { id: 'server-04', name: 'Backup Server', pos: [6,  0,  4] }
];

const ACCENT_BY_ID = {
  'server-01': 0x4a9eff, // Web - blue
  'server-02': 0x4ade80, // DB - green
  'server-03': 0xff9a3c, // App - orange
  'server-04': 0xa78bfa  // Backup - violet
};

const LCD_BY_ID = {
  'server-01': 'WE-01 OK',
  'server-02': 'DB-02 OK',
  'server-03': 'AP-03 OK',
  'server-04': 'BA-04 OK'
};

function makeLCDTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#88ff88';
  ctx.font = 'bold 36px monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function makeLabelTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#cccccc';
  ctx.font = 'bold 22px monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(text, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

function buildProceduralCabinet(data, accentColor) {
  const group = new THREE.Group();

  // Main body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 4, 1),
    new THREE.MeshLambertMaterial({ color: 0x3a3a3a })
  );
  body.position.y = 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Front panel: upper darker rectangle that holds the LCD
  const panelUpper = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.4, 0.05),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  );
  panelUpper.position.set(0, 3.55, 0.51);
  group.add(panelUpper);

  // LCD display
  const lcd = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.25),
    new THREE.MeshBasicMaterial({ map: makeLCDTexture(LCD_BY_ID[data.id] || 'SRV OK') })
  );
  lcd.position.set(0, 3.55, 0.54);
  group.add(lcd);

  // Ventilation grid: rows of small bars in the middle section
  const ventMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.04, 0.04),
        ventMat
      );
      bar.position.set(-0.42 + col * 0.17, 2.6 - row * 0.18, 0.52);
      group.add(bar);
    }
  }

  // Two status LEDs on the panel
  const ledGeo = new THREE.SphereGeometry(0.06, 12, 8);
  const ledMatL = new THREE.MeshBasicMaterial({ color: accentColor });
  const ledMatR = new THREE.MeshBasicMaterial({ color: accentColor });
  const ledL = new THREE.Mesh(ledGeo, ledMatL);
  ledL.position.set(-0.45, 3.55, 0.55);
  const ledR = new THREE.Mesh(ledGeo, ledMatR);
  ledR.position.set(0.45, 3.55, 0.55);
  group.add(ledL);
  group.add(ledR);

  // PointLight for glow
  const glowLight = new THREE.PointLight(accentColor, 0.8, 4);
  glowLight.position.set(0, 3.5, 0.8);
  group.add(glowLight);

  // Bottom label plate
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.15),
    new THREE.MeshBasicMaterial({ map: makeLabelTexture(data.id.toUpperCase()) })
  );
  label.position.set(0, 0.3, 0.52);
  group.add(label);

  // userData
  group.userData = {
    serverId: data.id,
    serverName: data.name,
    interactive: true,
    glowLight,
    accentColor,
    ledL,
    ledR
  };
  group.position.set(data.pos[0], 0, data.pos[2]);
  group.rotation.y = 0; // LCD faces +Z, toward the door (door at z=+18, spawn at z=+22)
  return group;
}

function buildDoorAndWall() {
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x2a2d2a });
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x4a0a0a });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });

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
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  scene.add(new THREE.GridHelper(40, 40, 0x333333, 0x333333));

  // Ceiling
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 5;
  scene.add(ceil);

  // Side and back walls (leave z=18 area for the door+wall section)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x2a2d2a });
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
  scene.add(new THREE.AmbientLight(0x888888, 1.0));
  scene.add(new THREE.HemisphereLight(0xaabbcc, 0x333333, 0.8));
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.5);
  mainLight.position.set(0, 8, 0);
  scene.add(mainLight);

  // Ceiling strips
  for (let i = -3; i <= 3; i += 2) {
    const stripLight = new THREE.PointLight(0xaabbcc, 0.4, 25);
    stripLight.position.set(i * 3, 4.5, 0);
    scene.add(stripLight);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.05, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xaabbcc })
    );
    strip.position.set(i * 3, 4.8, 0);
    scene.add(strip);
  }

  // Door + wall (with doorway)
  buildDoorAndWall();

  // Procedural industrial cabinets
  serverData.forEach(s => {
    const cabinet = buildProceduralCabinet(s, ACCENT_BY_ID[s.id]);
    scene.add(cabinet);
    cabinetMeshes.push(cabinet);
  });

  // Floor cables: colored ethernet, palette matches the cabinet accents
  const CABLE_COLORS = [0x4ade80, 0x4a9eff, 0xff5e5e, 0xffcc00, 0xa78bfa, 0xffffff];
  for (let i = 0; i < 6; i++) {
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 12, 6),
      new THREE.MeshLambertMaterial({ color: CABLE_COLORS[i % CABLE_COLORS.length] })
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
export function getDoor() { return doorMesh; }

export function renderFrame() {
  renderer.render(scene, camera);
}

export function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
