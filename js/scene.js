// js/scene.js — Three.js scene, cabinets, render helpers

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

  // Walls
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

  // Cabinets
  serverData.forEach(s => {
    const cabinet = buildCabinet(s);
    cabinet.userData = { serverId: s.id, serverName: s.name, interactive: true };
    cabinet.position.set(s.pos[0], 0, s.pos[2]);
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
