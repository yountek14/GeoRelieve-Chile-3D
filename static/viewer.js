import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const Z_EXAG = 4;
const OCEAN_DEPTH = -20;

let renderer, scene, camera, controls, sun;
let terrain = null;
let pin = null;
let showCompass = true;
let compassEl = null;
let scaleBarEl = null;
let scaleBarLabel = null;
const clock = new THREE.Clock();
const keys = {};

export function initViewer(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1828);
  scene.fog = new THREE.Fog(0x0a1828, 15000, 60000);

  camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 10, 120000);
  camera.position.set(0, 12000, -20000);  // ARRIBA, mirando el mapa desde el sur

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.minDistance = 100;
  controls.maxDistance = 60000;

  sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(-6000, 12000, 4000);  // luz desde ARRIBA (noroeste)
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));       // relleno parejo (ambos lados)
  scene.add(new THREE.HemisphereLight(0xaaccff, 0x3a4a3a, 0.6));

  compassEl = document.getElementById('compass');
  scaleBarEl = document.getElementById('scalebar-bar');
  scaleBarLabel = document.getElementById('scalebar-label');

  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'KeyR') resetCamera(); if (e.code === 'KeyC') toggleCompass(); });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  animate();
}

function onResize() {
  const c = renderer.domElement;
  camera.aspect = c.clientWidth / c.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(c.clientWidth, c.clientHeight);
}

function resetCamera() {
  camera.position.set(0, 12000, -20000);
  controls.target.set(0, 0, 0);
}

function toggleCompass() {
  showCompass = !showCompass;
  if (compassEl) compassEl.style.display = showCompass ? '' : 'none';
}

function updateCompass() {
  if (!showCompass || !compassEl || !camera || !controls) return;
  const forward = new THREE.Vector3().subVectors(controls.target, camera.position);
  const len = Math.hypot(forward.x, forward.z);
  if (len < 1e-6) return;
  const yaw = (Math.atan2(forward.x, forward.z) * 180) / Math.PI;
  compassEl.style.transform = `rotate(${yaw}deg)`;
}

function updateScaleBar() {
  if (!scaleBarEl || !camera || !controls) return;
  const dist = camera.position.distanceTo(controls.target);
  const canvasH = renderer.domElement.clientHeight;
  const visibleH = 2 * dist * Math.tan(((camera.fov * Math.PI) / 180) / 2);
  const mPerPx = visibleH / canvasH;

  const nice = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
  const targetPx = 130;
  let chosen = nice[0];
  for (const m of nice) {
    if (m / mPerPx <= targetPx) chosen = m;
    else break;
  }
  scaleBarEl.style.width = `${Math.round(chosen / mPerPx)}px`;
  if (scaleBarLabel) {
    scaleBarLabel.textContent = chosen >= 1000 ? `${chosen / 1000} km` : `${chosen} m`;
  }
}

function moveCamera(dt) {
  const speed = 9000 * dt;
  const dir = new THREE.Vector3();
  if (keys['KeyW'] || keys['ArrowUp']) dir.z -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dir.z += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dir.x -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dir.x += 1;
  if (keys['KeyQ']) dir.y += 1;
  if (keys['KeyE']) dir.y -= 1;
  if (dir.lengthSq() === 0) return;
  dir.normalize();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0; forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const move = new THREE.Vector3();
  move.addScaledVector(forward, -dir.z);
  move.addScaledVector(right, dir.x);
  move.y = dir.y;
  camera.position.addScaledVector(move, speed);
  controls.target.addScaledVector(move, speed);
}

function animate() {
  const dt = clock.getDelta();
  moveCamera(dt);
  controls.update();
  renderer.render(scene, camera);
  updateCompass();
  updateScaleBar();
  requestAnimationFrame(animate);
}

const PALETTES = {
  terreno: [
    [0.00, [0.02, 0.10, 0.30]],
    [0.10, [0.10, 0.30, 0.65]],
    [0.22, [0.20, 0.55, 0.80]],
    [0.35, [0.45, 0.85, 0.85]],
    [0.50, [0.95, 0.90, 0.50]],
    [0.65, [0.95, 0.70, 0.30]],
    [0.80, [0.85, 0.40, 0.20]],
    [0.92, [0.75, 0.15, 0.10]],
    [1.00, [0.50, 0.00, 0.00]],
  ],
  batimetria: [
    [0.00, [0.01, 0.10, 0.24]],
    [0.20, [0.02, 0.22, 0.45]],
    [0.40, [0.05, 0.45, 0.65]],
    [0.60, [0.30, 0.70, 0.80]],
    [0.80, [0.70, 0.90, 0.90]],
    [1.00, [1.00, 1.00, 1.00]],
  ],
  fuego: [
    [0.00, [0.00, 0.00, 0.00]],
    [0.25, [0.35, 0.00, 0.00]],
    [0.50, [0.75, 0.20, 0.00]],
    [0.70, [0.95, 0.55, 0.10]],
    [0.85, [1.00, 0.85, 0.30]],
    [1.00, [1.00, 1.00, 1.00]],
  ],
  grises: [
    [0.00, [0.12, 0.12, 0.12]],
    [0.50, [0.55, 0.55, 0.55]],
    [1.00, [0.95, 0.95, 0.95]],
  ],
};

let currentPalette = 'terreno';

function colorRamp(t) {
  const stops = PALETTES[currentPalette];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      const a = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
      return [
        stops[i][1][0] + (stops[i + 1][1][0] - stops[i][1][0]) * a,
        stops[i][1][1] + (stops[i + 1][1][1] - stops[i][1][1]) * a,
        stops[i][1][2] + (stops[i + 1][1][2] - stops[i][1][2]) * a,
      ];
    }
  }
  return [1, 1, 1];
}

export function setPalette(name) {
  if (!PALETTES[name] || name === currentPalette) return;
  currentPalette = name;
  renderTerrain();
}

export function getPaletteNames() {
  return Object.keys(PALETTES);
}

export function paletteCss(name) {
  const stops = PALETTES[name] || PALETTES.terreno;
  const parts = stops.map(([t, c]) => {
    const r = Math.round(c[0] * 255);
    const g = Math.round(c[1] * 255);
    const b = Math.round(c[2] * 255);
    return `rgb(${r},${g},${b}) ${Math.round(t * 100)}%`;
  });
  return `linear-gradient(to top, ${parts.join(', ')})`;
}

let currentData = null;
let currentMode = 'dem';
let flippedHeights = [];
let flippedHillshade = [];
let satelliteTexture = null;

export function setMapMode(mode) {
  currentMode = mode;
  renderTerrain();
}

export function loadTerrain(data) {
  if (terrain) {
    scene.remove(terrain);
    terrain.geometry.dispose();
    terrain.material.dispose();
    terrain = null;
  }
  currentData = data;
  satelliteTexture = null;

  const Ws = data.Ws;
  const Hs = data.Hs;
  const srcH = data.heights;
  const srcS = data.hillshade || [];

  // Voltear filas y columnas (norte arriba / este a la derecha)
  flippedHeights = new Array(Ws * Hs);
  flippedHillshade = new Array(Ws * Hs);
  for (let r = 0; r < Hs; r++) {
    const sr = (Hs - 1 - r) * Ws;
    const dr = r * Ws;
    for (let c = 0; c < Ws; c++) {
      const v = srcH[sr + (Ws - 1 - c)];
      flippedHeights[dr + c] = (v === null ? OCEAN_DEPTH : v);
      flippedHillshade[dr + c] = srcS.length ? srcS[sr + (Ws - 1 - c)] : 255;
    }
  }

  const geo = new THREE.PlaneGeometry(data.width_m, data.height_m, Ws - 1, Hs - 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, flippedHeights[i] * Z_EXAG);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  terrain = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  terrain.rotation.x = -Math.PI / 2;
  scene.add(terrain);

  renderTerrain();
  addPin(data);
  resetCamera();
}

function addPin(data) {
  if (pin) {
    scene.remove(pin);
    pin = null;
  }
  const Ws = data.Ws;
  const Hs = data.Hs;
  const ci = Math.floor(Hs / 2) * Ws + Math.floor(Ws / 2);
  const elev = typeof flippedHeights[ci] === 'number' ? flippedHeights[ci] : 0;
  const surfaceY = elev * Z_EXAG;
  const poleH = Math.max(600, data.width_m * 0.03);

  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(40, 40, poleH, 8),
    new THREE.MeshBasicMaterial({ color: 0xffeb3b })
  );
  pole.position.y = poleH / 2;
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(110, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffeb3b })
  );
  ball.position.y = poleH;
  group.add(pole, ball);
  group.position.set(0, surfaceY, 0);
  scene.add(group);
  pin = group;
}

function renderTerrain() {
  if (!terrain || !currentData) return;
  if (currentMode === 'satelital') {
    renderSatellite();
  } else {
    renderColors();
  }
}

function renderColors() {
  const n = flippedHeights.length;
  const colors = new Float32Array(n * 3);
  const zMin = Math.min(OCEAN_DEPTH, currentData.zmin) * Z_EXAG;
  const zMax = currentData.zmax * Z_EXAG;
  for (let i = 0; i < n; i++) {
    const h = flippedHillshade[i] / 255;
    let r, g, b;
    if (currentMode === 'hillshade') {
      r = h; g = h; b = h;
    } else {
      const t = Math.min(1, Math.max(0, (flippedHeights[i] * Z_EXAG - zMin) / (zMax - zMin)));
      const c = colorRamp(t);
      r = c[0] * h; g = c[1] * h; b = c[2] * h;
    }
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  terrain.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrain.material.dispose();
  terrain.material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function lonToPixelX(lon, z) {
  return ((lon + 180) / 360) * Math.pow(2, z) * 256;
}
function latToPixelY(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z) * 256;
}

async function loadSatelliteTexture(data) {
  const z = 13;
  const x0 = lonToPixelX(data.west, z);
  const x1 = lonToPixelX(data.east, z);
  const y0 = latToPixelY(data.north, z);
  const y1 = latToPixelY(data.south, z);

  const tx0 = Math.floor(x0 / 256);
  const tx1 = Math.floor(x1 / 256);
  const ty0 = Math.floor(y0 / 256);
  const ty1 = Math.floor(y1 / 256);
  const cols = tx1 - tx0 + 1;
  const rows = ty1 - ty0 + 1;

  const jobs = [];
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      jobs.push({ tx, ty });
    }
  }

  const imgs = await Promise.all(
    jobs.map((j) =>
      loadImage(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${j.ty}/${j.tx}`)
    )
  );

  const canvas = document.createElement('canvas');
  canvas.width = cols * 256;
  canvas.height = rows * 256;
  const ctx = canvas.getContext('2d');
  jobs.forEach((j, k) => {
    ctx.drawImage(imgs[k], (j.tx - tx0) * 256, (j.ty - ty0) * 256);
  });

  const px0 = x0 - tx0 * 256;
  const py0 = y0 - ty0 * 256;
  const pw = Math.max(1, Math.round(x1 - x0));
  const ph = Math.max(1, Math.round(y1 - y0));

  const out = document.createElement('canvas');
  out.width = pw;
  out.height = ph;
  const octx = out.getContext('2d');
  octx.translate(pw, 0);
  octx.scale(-1, 1);
  octx.drawImage(canvas, px0, py0, pw, ph, 0, 0, pw, ph);

  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

async function renderSatellite() {
  try {
    if (!satelliteTexture) {
      satelliteTexture = await loadSatelliteTexture(currentData);
    }
    terrain.material.dispose();
    terrain.material = new THREE.MeshBasicMaterial({ map: satelliteTexture, side: THREE.DoubleSide });
  } catch (e) {
    console.error('Error cargando textura satelital', e);
  }
}
