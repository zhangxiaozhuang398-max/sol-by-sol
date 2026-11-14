// The walkable 3D Mars surface.
//
// Terrain is REAL: every block column is one cell of NASA's MOLA elevation grid
// for Jezero crater (about 463 m per cell), coloured from the Viking orbiter
// mosaic (see scripts/fetch_mars_terrain.mjs). Heights are stepped into blocks
// and exaggerated vertically so the crater shape is easy to see.
//
// This module only draws and moves things. Game rules stay in game.js; the UI
// (main.js) tells the world which targets exist and reacts when the player
// walks up to one.

import * as THREE from "./vendor/three.module.min.js";

const LEVEL_M = 40; // metres of real elevation per block level
const STEP = 0.4; // block height in world units (1 unit = one terrain cell)
const WALK_SPEED = 8.5;
const TURN_SPEED = 2.6;
const CAM_BACK = 7.5;
const CAM_UP = 4.2;

const SKY = {
  sunny: 0xe3b58a,
  hazy: 0xc9966b,
  dust: 0x9a5f38,
  morning: 0xf2b596,
  night: 0x0d0b1e,
};
const FOG = { sunny: [45, 190], hazy: [16, 80], dust: [5, 30], night: [30, 130] };

const srgb = (hex) => new THREE.Color(hex);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${src}`));
    img.src = src;
  });
}

// ---------- real data → block levels + colours ----------
async function loadTerrain(dataDir) {
  const d = await fetch(`${dataDir}/jezero_terrain.json`).then((r) => r.json());
  const n = d.size;
  const levels = new Int16Array(n * n);
  for (let i = 0; i < n * n; i++) levels[i] = Math.round((d.heights[i] - d.minElevation) / LEVEL_M);

  // Stitch the Viking colour tiles into one picture of exactly this bounding box.
  const W = 512;
  const pic = document.createElement("canvas");
  pic.width = pic.height = W;
  const ctx = pic.getContext("2d");
  const { west, east, north, south } = d.bbox;
  const imgs = await Promise.all(d.tiles.map((t) => loadImage(`${dataDir}/${t.file}`)));
  d.tiles.forEach((t, i) => {
    const x0 = ((t.west - west) / (east - west)) * W;
    const x1 = ((t.east - west) / (east - west)) * W;
    const y0 = ((north - t.north) / (north - south)) * W;
    const y1 = ((north - t.south) / (north - south)) * W;
    ctx.drawImage(imgs[i], x0, y0, x1 - x0, y1 - y0);
  });

  // One colour per terrain cell.
  const small = document.createElement("canvas");
  small.width = small.height = n;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(pic, 0, 0, n, n);
  const px = sctx.getImageData(0, 0, n, n).data;

  // Minimap: the real picture, shaded by the real elevation so the crater pops.
  const map = document.createElement("canvas");
  map.width = map.height = n;
  const mctx = map.getContext("2d");
  const out = mctx.createImageData(n, n);
  const H = (c, r) => d.heights[Math.max(0, Math.min(n - 1, r)) * n + Math.max(0, Math.min(n - 1, c))];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = (r * n + c) * 4;
      const slope = (H(c - 1, r) - H(c + 1, r) + H(c, r - 1) - H(c, r + 1)) / 400; // light from the north-west
      const shade = Math.max(0.45, Math.min(1.5, 1 + slope));
      out.data[i] = Math.min(255, px[i] * shade * 1.25);
      out.data[i + 1] = Math.min(255, px[i + 1] * shade * 1.2);
      out.data[i + 2] = Math.min(255, px[i + 2] * shade * 1.15);
      out.data[i + 3] = 255;
    }
  }
  mctx.putImageData(out, 0, 0);
  return { d, n, levels, px, map };
}

function buildTerrainMesh({ n, levels, px }) {
  const pos = [];
  const col = [];
  const nor = [];
  const Y = (c, r) => (c < 0 || r < 0 || c >= n || r >= n ? -4 : levels[r * n + c] * STEP);
  const tmp = new THREE.Color();
  const quad = (a, b, c, d, normal, rgb, shade) => {
    for (const p of [a, b, c, a, c, d]) {
      pos.push(p[0], p[1], p[2]);
      nor.push(normal[0], normal[1], normal[2]);
      col.push(rgb.r * shade, rgb.g * shade, rgb.b * shade);
    }
  };
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = (r * n + c) * 4;
      // tiny per-block variation so neighbouring blocks read as separate cubes
      const jitter = 0.94 + (((c * 73856093) ^ (r * 19349663)) >>> 0) % 13 / 100;
      tmp.setRGB(
        Math.min(1, (px[i] / 255) * 1.5 * jitter),
        Math.min(1, (px[i + 1] / 255) * 1.36 * jitter),
        Math.min(1, (px[i + 2] / 255) * 1.22 * jitter),
        THREE.SRGBColorSpace,
      );
      const rgb = { r: tmp.r, g: tmp.g, b: tmp.b };
      const y = Y(c, r);
      quad([c, y, r], [c, y, r + 1], [c + 1, y, r + 1], [c + 1, y, r], [0, 1, 0], rgb, 1);
      let yl = Y(c + 1, r);
      if (yl < y) quad([c + 1, y, r], [c + 1, y, r + 1], [c + 1, yl, r + 1], [c + 1, yl, r], [1, 0, 0], rgb, 0.8);
      yl = Y(c - 1, r);
      if (yl < y) quad([c, y, r + 1], [c, y, r], [c, yl, r], [c, yl, r + 1], [-1, 0, 0], rgb, 0.62);
      yl = Y(c, r + 1);
      if (yl < y) quad([c + 1, y, r + 1], [c, y, r + 1], [c, yl, r + 1], [c + 1, yl, r + 1], [0, 0, 1], rgb, 0.74);
      yl = Y(c, r - 1);
      if (yl < y) quad([c, y, r], [c + 1, y, r], [c + 1, yl, r], [c, yl, r], [0, 0, -1], rgb, 0.68);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
}

// ---------- little blocky models ----------
function box(w, h, d, color, opts = {}) {
  const mat = new THREE.MeshLambertMaterial({ color: srgb(color), ...opts });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.y = h / 2;
  return m;
}

function makeAstronaut() {
  const g = new THREE.Group();
  const legL = box(0.2, 0.45, 0.22, 0xdfe3ea);
  const legR = box(0.2, 0.45, 0.22, 0xdfe3ea);
  legL.position.x = -0.13;
  legR.position.x = 0.13;
  const body = box(0.56, 0.55, 0.34, 0xf5f6fa);
  body.position.y = 0.45 + 0.275;
  const pack = box(0.44, 0.5, 0.2, 0x9aa3b5);
  pack.position.set(0, 0.45 + 0.25, -0.26);
  const head = box(0.46, 0.42, 0.42, 0xffffff);
  head.position.y = 1.0 + 0.21;
  const visor = box(0.34, 0.24, 0.04, 0xf3b562, { emissive: srgb(0x7a4a10) });
  visor.position.set(0, 1.0 + 0.2, 0.22);
  const armL = box(0.16, 0.46, 0.2, 0xe7eaf0);
  const armR = box(0.16, 0.46, 0.2, 0xe7eaf0);
  armL.position.set(-0.37, 0.5 + 0.23, 0);
  armR.position.set(0.37, 0.5 + 0.23, 0);
  const stripe = box(0.57, 0.1, 0.35, 0xe46a3c);
  stripe.position.y = 0.78;
  g.add(legL, legR, body, pack, head, visor, armL, armR, stripe);
  g.userData = { legL, legR, armL, armR };
  return g;
}

function makeHabitat() {
  const g = new THREE.Group();
  const main = box(2.6, 1.5, 2.2, 0xe9e4f5);
  const roof = box(2.2, 0.35, 1.8, 0xd3cde6);
  roof.position.y = 1.5 + 0.175;
  const door = box(0.6, 0.9, 0.08, 0x6c5ba8);
  door.position.set(0, 0.45, 1.12);
  const winMat = new THREE.MeshLambertMaterial({ color: srgb(0x4fd1c5), emissive: srgb(0x000000) });
  const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.08), winMat);
  const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.08), winMat);
  win1.position.set(-0.85, 0.95, 1.12);
  win2.position.set(0.85, 0.95, 1.12);
  const pole = box(0.06, 1.6, 0.06, 0xdddddd);
  pole.position.set(1.15, 1.5, -0.9);
  const flag = box(0.5, 0.3, 0.04, 0xe46a3c);
  flag.position.set(1.42, 2.75, -0.9);
  g.add(main, roof, door, win1, win2, pole, flag);
  g.userData = { winMat };
  return g;
}

function makePanels() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const leg = box(0.1, 0.5, 0.1, 0x888888);
    leg.position.set(0, 0.25, (i - 1) * 1.1);
    const panel = box(1.5, 0.08, 0.9, 0x3d5fbf, { emissive: srgb(0x0a1a44) });
    panel.position.set(0, 0.62, (i - 1) * 1.1);
    panel.rotation.z = -0.45;
    g.add(leg, panel);
  }
  return g;
}

function makeGreenhouse() {
  const g = new THREE.Group();
  const base = box(1.8, 0.25, 1.5, 0x7a6a58);
  const glass = box(1.7, 0.95, 1.4, 0x7ad67a, { transparent: true, opacity: 0.55 });
  glass.position.y = 0.25 + 0.475;
  for (let i = 0; i < 3; i++) {
    const plant = box(0.22, 0.4, 0.22, 0x2f9e44);
    plant.position.set((i - 1) * 0.5, 0.45, 0);
    g.add(plant);
  }
  g.add(base, glass);
  return g;
}

function makeAntenna() {
  const g = new THREE.Group();
  const mast = box(0.14, 2.2, 0.14, 0xcccccc);
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.15, 0.3, 8),
    new THREE.MeshLambertMaterial({ color: srgb(0xf5f6fa) }),
  );
  dish.position.set(0, 2.3, 0.1);
  dish.rotation.x = Math.PI / 3;
  const tip = box(0.12, 0.12, 0.12, 0x4fd1c5, { emissive: srgb(0x1c6f68) });
  tip.position.set(0, 2.55, 0.5);
  g.add(mast, dish, tip);
  return g;
}

function makeRover() {
  const g = new THREE.Group();
  const body = box(1.0, 0.3, 0.7, 0xe9e4f5);
  body.position.y = 0.45;
  const mast = box(0.1, 0.7, 0.1, 0xcccccc);
  mast.position.set(0.3, 0.75, 0.2);
  const cam = box(0.3, 0.16, 0.16, 0x333344);
  cam.position.set(0.3, 1.45, 0.2);
  g.add(body, mast, cam);
  for (const [x, z] of [[-0.4, 0.42], [0, 0.42], [0.4, 0.42], [-0.4, -0.42], [0, -0.42], [0.4, -0.42]]) {
    const wheel = box(0.26, 0.26, 0.14, 0x33303a);
    wheel.position.set(x, 0.13, z);
    g.add(wheel);
  }
  return g;
}

const MODELS = { habitat: makeHabitat, panels: makePanels, greenhouse: makeGreenhouse, antenna: makeAntenna, landmark: makeRover };

function makeLabel(text, { done = false, big = false } = {}) {
  const pad = 26;
  const font = '800 54px "Nunito", "PingFang SC", "Microsoft YaHei", sans-serif';
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = font;
  const w = Math.ceil(measure.measureText(text).width) + pad * 2;
  const h = 96;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d");
  c.fillStyle = done ? "rgba(31,77,61,0.9)" : "rgba(27,21,48,0.86)";
  c.beginPath();
  c.roundRect(0, 0, w, h, 40);
  c.fill();
  c.strokeStyle = done ? "#7ad67a" : "#f3b562";
  c.lineWidth = 5;
  c.beginPath();
  c.roundRect(3, 3, w - 6, h - 6, 38);
  c.stroke();
  c.font = font;
  c.fillStyle = "#fbf4ea";
  c.textBaseline = "middle";
  c.fillText(text, pad, h / 2 + 3);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, fog: false, sizeAttenuation: !big });
  const sp = new THREE.Sprite(mat);
  const k = big ? 0.00068 : 0.0068;
  sp.scale.set(w * k, h * k, 1);
  sp.renderOrder = 10;
  return sp;
}

// ---------- the world ----------
export async function createWorld(opts) {
  const { mount, minimap, joystick, dataDir = "data/mars", onNear = () => {}, onUse = () => {} } = opts;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch {
    return null; // no WebGL: the UI falls back to the simple map
  }
  let T;
  try {
    T = await loadTerrain(dataDir);
  } catch (err) {
    console.warn("Mars terrain failed to load", err);
    renderer.dispose();
    return null;
  }
  const n = T.n;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = srgb(SKY.sunny);
  scene.fog = new THREE.Fog(srgb(SKY.sunny), FOG.sunny[0], FOG.sunny[1]);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);

  const hemi = new THREE.HemisphereLight(srgb(0xffe6cc), srgb(0x6b3a22), 1.5);
  const sun = new THREE.DirectionalLight(srgb(0xfff1dd), 2.2);
  sun.position.set(0.5, 1, 0.35);
  scene.add(hemi, sun);

  scene.add(buildTerrainMesh(T));
  // a wide dusty plain beyond the edge of the data, hidden by the haze
  const plain = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshLambertMaterial({ color: srgb(0x8f4a2a) }));
  plain.rotation.x = -Math.PI / 2;
  plain.position.set(n / 2, -3.9, n / 2);
  scene.add(plain);

  // stars (night only)
  const starPos = [];
  for (let i = 0; i < 700; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * Math.PI * 0.48 + 0.04;
    starPos.push(Math.cos(a) * Math.cos(e) * 380, Math.sin(e) * 380, Math.sin(a) * Math.cos(e) * 380);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false }));
  stars.visible = false;
  scene.add(stars);

  // blowing dust (dust-storm sols)
  const DUST_N = 500;
  const dustArr = new Float32Array(DUST_N * 3);
  for (let i = 0; i < DUST_N * 3; i++) dustArr[i] = (Math.random() - 0.5) * 36;
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustArr, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: srgb(0xf0c08a), size: 0.14, transparent: true, opacity: 0.75 }));
  dust.visible = false;
  dust.frustumCulled = false;
  scene.add(dust);

  const heightAt = (x, z) => {
    const c = Math.max(0, Math.min(n - 1, Math.floor(x)));
    const r = Math.max(0, Math.min(n - 1, Math.floor(z)));
    return T.levels[r * n + c] * STEP;
  };

  const player = makeAstronaut();
  scene.add(player);
  const st = {
    x: n / 2, z: n / 2, y: 0, heading: 0, moving: false, walkT: 0,
    spawn: { x: n / 2, z: n / 2, heading: 0 },
    mode: "cinematic", // or "play"
    enabled: true,
    phase: "day",
    weather: "sunny",
    orbit: 0,
    near: null,
    running: false,
  };

  // ---------- targets ----------
  let targets = [];
  let solids = [];
  const targetGroup = new THREE.Group();
  scene.add(targetGroup);
  let targetKey = "";
  let habitatModel = null;

  function setTargets(list) {
    const key = JSON.stringify(list.map((t) => [t.id, t.label, t.done, t.x, t.z]));
    if (key === targetKey) return;
    targetKey = key;
    targetGroup.traverse((o) => {
      if (o.material?.map) o.material.map.dispose();
      if (o.material) o.material.dispose?.();
      if (o.geometry) o.geometry.dispose?.();
    });
    targetGroup.clear();
    targets = list;
    solids = [];
    habitatModel = null;
    for (const t of list) {
      const y = heightAt(t.x, t.z);
      if (t.kind === "site") {
        const color = t.done ? 0x7ad67a : [0, 0xf3b562, 0xff8a55, 0xff5d73][t.tier] || 0xf3b562;
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, 14, 8),
          new THREE.MeshBasicMaterial({ color: srgb(color), transparent: true, opacity: 0.5, fog: false, depthWrite: false }),
        );
        beam.position.set(t.x, y + 7, t.z);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(t.r * 0.8, 0.07, 6, 28),
          new THREE.MeshBasicMaterial({ color: srgb(color), fog: false }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(t.x, y + 0.08, t.z);
        const label = makeLabel(t.label, { done: t.done, big: true });
        label.position.set(t.x, y + 15, t.z);
        targetGroup.add(beam, ring, label);
      } else {
        const make = MODELS[t.model || t.kind];
        if (make) {
          const m = make();
          m.position.set(t.mx ?? t.x, heightAt(t.mx ?? t.x, t.mz ?? t.z), t.mz ?? t.z);
          if (t.rot) m.rotation.y = t.rot;
          targetGroup.add(m);
          if (t.kind === "habitat") habitatModel = m;
          if (t.solid) solids.push({ x: t.mx ?? t.x, z: t.mz ?? t.z, r: t.solid });
        }
        const label = makeLabel(t.label, { done: t.done });
        label.position.set(t.mx ?? t.x, heightAt(t.mx ?? t.x, t.mz ?? t.z) + (t.labelY || 3), t.mz ?? t.z);
        targetGroup.add(label);
      }
    }
    applyPhase();
  }

  // ---------- look: phase + weather ----------
  function applyPhase() {
    const night = st.phase === "night" || st.phase === "settle";
    const morning = st.phase === "briefing";
    const w = night ? "night" : st.weather;
    const sky = srgb(night ? SKY.night : morning && st.weather === "sunny" ? SKY.morning : SKY[st.weather]);
    scene.background = sky;
    scene.fog.color.copy(sky);
    const [near, far] = night ? (st.weather === "dust" ? FOG.dust : FOG.night) : FOG[w];
    scene.fog.near = near;
    scene.fog.far = far;
    stars.visible = night && st.weather !== "dust";
    dust.visible = st.weather === "dust";
    if (night) {
      hemi.intensity = 0.55;
      hemi.color.set(0x8ea0ff);
      sun.intensity = 0.35;
      sun.color.set(0xaab8ff);
    } else {
      const dim = st.weather === "dust" ? 0.55 : st.weather === "hazy" ? 0.8 : 1;
      hemi.intensity = 1.5 * dim;
      hemi.color.set(0xffe6cc);
      sun.intensity = (morning ? 1.7 : 2.2) * dim;
      sun.color.set(morning ? 0xffc79a : 0xfff1dd);
      sun.position.set(morning ? 1 : 0.5, morning ? 0.4 : 1, 0.35);
    }
    if (habitatModel) habitatModel.userData.winMat.emissive.set(night ? 0x3fb8ad : 0x000000);
  }

  // ---------- input ----------
  const keys = new Set();
  const joy = { x: 0, y: 0 };
  const MOVE_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"];
  const canControl = () => st.mode === "play" && st.enabled && st.running && !document.querySelector("dialog[open]");
  const typing = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");

  function onKeyDown(e) {
    if (!canControl() || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (MOVE_KEYS.includes(e.code)) {
      keys.add(e.code);
      e.preventDefault();
    } else if (e.code === "KeyE" || ((e.code === "Space" || e.code === "Enter") && e.target.tagName !== "BUTTON")) {
      e.preventDefault();
      if (!e.repeat) onUse();
    }
  }
  const onKeyUp = (e) => keys.delete(e.code);
  const onBlur = () => keys.clear();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  // drag on the view to turn
  let drag = null;
  const cv = renderer.domElement;
  cv.style.touchAction = "none";
  cv.addEventListener("pointerdown", (e) => {
    if (!canControl()) return;
    drag = { id: e.pointerId, x: e.clientX };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    st.heading -= (e.clientX - drag.x) * 0.006;
    drag.x = e.clientX;
  });
  const endDrag = (e) => { if (drag && drag.id === e.pointerId) drag = null; };
  cv.addEventListener("pointerup", endDrag);
  cv.addEventListener("pointercancel", endDrag);

  // touch joystick
  if (joystick) {
    const knob = joystick.querySelector("i");
    let jid = null;
    const setJoy = (e) => {
      const b = joystick.getBoundingClientRect();
      let dx = (e.clientX - (b.left + b.width / 2)) / (b.width / 2);
      let dy = (e.clientY - (b.top + b.height / 2)) / (b.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      joy.x = dx;
      joy.y = dy;
      if (knob) knob.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
    };
    const clearJoy = () => {
      jid = null;
      joy.x = joy.y = 0;
      if (knob) knob.style.transform = "";
    };
    joystick.style.touchAction = "none";
    joystick.addEventListener("pointerdown", (e) => { jid = e.pointerId; joystick.setPointerCapture(e.pointerId); setJoy(e); e.preventDefault(); });
    joystick.addEventListener("pointermove", (e) => { if (jid === e.pointerId) setJoy(e); });
    joystick.addEventListener("pointerup", clearJoy);
    joystick.addEventListener("pointercancel", clearJoy);
  }

  // ---------- simulation ----------
  function step(dt) {
    if (st.mode === "play") {
      let fwd = 0;
      let turn = 0;
      if (canControl()) {
        if (keys.has("ArrowUp") || keys.has("KeyW")) fwd += 1;
        if (keys.has("ArrowDown") || keys.has("KeyS")) fwd -= 0.6;
        if (keys.has("ArrowLeft") || keys.has("KeyA")) turn += 1;
        if (keys.has("ArrowRight") || keys.has("KeyD")) turn -= 1;
        if (Math.abs(joy.y) > 0.15) fwd += -joy.y * (joy.y < 0 ? 1 : 0.6);
        if (Math.abs(joy.x) > 0.2) turn += -joy.x;
      }
      fwd = Math.max(-0.6, Math.min(1, fwd));
      turn = Math.max(-1, Math.min(1, turn));
      st.heading += turn * TURN_SPEED * dt;
      const slow = st.weather === "dust" ? 0.8 : 1;
      let nx = st.x + Math.sin(st.heading) * fwd * WALK_SPEED * slow * dt;
      let nz = st.z + Math.cos(st.heading) * fwd * WALK_SPEED * slow * dt;
      nx = Math.max(1.5, Math.min(n - 1.5, nx));
      nz = Math.max(1.5, Math.min(n - 1.5, nz));
      for (const s of solids) {
        const dx = nx - s.x;
        const dz = nz - s.z;
        const dist = Math.hypot(dx, dz);
        if (dist < s.r && dist > 0.0001) {
          nx = s.x + (dx / dist) * s.r;
          nz = s.z + (dz / dist) * s.r;
        }
      }
      st.x = nx;
      st.z = nz;
      st.moving = Math.abs(fwd) > 0.05;
      if (st.moving) st.walkT += dt * 11 * Math.abs(fwd);
    } else {
      st.moving = false;
      st.orbit += dt * 0.12;
    }

    // feet follow the blocks; smooth so stepping up reads as a hop, not a snap
    const ground = heightAt(st.x, st.z);
    st.y += (ground - st.y) * Math.min(1, dt * 12);
    const bob = st.moving ? Math.abs(Math.sin(st.walkT)) * 0.09 : 0;
    player.position.set(st.x, st.y + bob, st.z);
    player.rotation.y = st.heading;
    const swing = st.moving ? Math.sin(st.walkT) * 0.7 : 0;
    const u = player.userData;
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.8;
    u.armR.rotation.x = swing * 0.8;

    // camera
    let cx, cy, cz, lx, ly, lz;
    if (st.mode === "play") {
      cx = st.x - Math.sin(st.heading) * CAM_BACK;
      cz = st.z - Math.cos(st.heading) * CAM_BACK;
      cy = Math.max(st.y + CAM_UP, heightAt(cx, cz) + 1.6);
      lx = st.x + Math.sin(st.heading) * 3;
      ly = st.y + 1.1;
      lz = st.z + Math.cos(st.heading) * 3;
    } else {
      const bx = st.spawn.x;
      const bz = st.spawn.z - 3;
      cx = bx + Math.sin(st.orbit) * 15;
      cz = bz + Math.cos(st.orbit) * 15;
      cy = Math.max(heightAt(bx, bz) + 6, heightAt(cx, cz) + 2);
      lx = bx;
      ly = heightAt(bx, bz) + 1;
      lz = bz;
    }
    const k = st.snap ? 1 : Math.min(1, dt * 6);
    st.snap = false;
    camera.position.set(
      camera.position.x + (cx - camera.position.x) * k,
      camera.position.y + (cy - camera.position.y) * k,
      camera.position.z + (cz - camera.position.z) * k,
    );
    camera.lookAt(lx, ly, lz);
    stars.position.copy(camera.position);

    if (dust.visible) {
      const arr = dustGeo.attributes.position.array;
      for (let i = 0; i < DUST_N; i++) {
        arr[i * 3] += dt * 9;
        arr[i * 3 + 1] += dt * 0.6;
        if (arr[i * 3] > 18) arr[i * 3] = -18;
        if (arr[i * 3 + 1] > 10) arr[i * 3 + 1] = -2;
      }
      dustGeo.attributes.position.needsUpdate = true;
      dust.position.set(st.x, st.y + 2, st.z);
    }

    // which target is the player standing at?
    let best = null;
    if (st.mode === "play") {
      let bestD = Infinity;
      for (const t of targets) {
        const d = Math.hypot(st.x - t.x, st.z - t.z);
        if (d <= t.r && d < bestD) { best = t; bestD = d; }
      }
    }
    const id = best ? best.id : null;
    if (id !== st.near) {
      st.near = id;
      onNear(id);
    }
  }

  function drawMinimap() {
    if (!minimap) return;
    const c = minimap.getContext("2d");
    const S = minimap.width;
    const k = S / n;
    c.imageSmoothingEnabled = true;
    c.drawImage(T.map, 0, 0, S, S);
    for (const t of targets) {
      const x = t.x * k;
      const y = t.z * k;
      if (t.kind === "site") {
        c.beginPath();
        c.arc(x, y, 5, 0, Math.PI * 2);
        c.fillStyle = t.done ? "#7ad67a" : "#f3b562";
        c.fill();
        c.lineWidth = 2;
        c.strokeStyle = "#1b1530";
        c.stroke();
      } else if (t.kind === "habitat") {
        c.fillStyle = "#ffffff";
        c.strokeStyle = "#1b1530";
        c.lineWidth = 2;
        c.fillRect(x - 5, y - 5, 10, 10);
        c.strokeRect(x - 5, y - 5, 10, 10);
      } else if (t.kind === "landmark") {
        c.fillStyle = "#4fd1c5";
        c.fillRect(x - 3, y - 3, 6, 6);
      }
    }
    // player arrow
    c.save();
    c.translate(st.x * k, st.z * k);
    c.rotate(-st.heading);
    c.beginPath();
    c.moveTo(0, 8);
    c.lineTo(5, -5);
    c.lineTo(0, -2);
    c.lineTo(-5, -5);
    c.closePath();
    c.fillStyle = "#ff5d73";
    c.strokeStyle = "#ffffff";
    c.lineWidth = 1.5;
    c.fill();
    c.stroke();
    c.restore();
  }

  // ---------- loop + sizing ----------
  function resize() {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (st.running) renderer.render(scene, camera); // resizing clears the canvas: redraw at once
  }
  new ResizeObserver(resize).observe(mount);
  resize();

  let last = performance.now();
  let raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    renderer.render(scene, camera);
    if (st.mode === "play") drawMinimap();
  }

  const api = {
    size: n,
    info: T.d,
    heightAt,
    setTargets,
    setSpawn(x, z, heading = 0) {
      st.spawn = { x, z, heading };
    },
    respawn() {
      st.x = st.spawn.x;
      st.z = st.spawn.z;
      st.heading = st.spawn.heading;
      st.y = heightAt(st.x, st.z);
      st.near = null;
      st.snap = true;
      keys.clear();
    },
    setMode(mode) {
      if (st.mode === mode) return;
      st.mode = mode;
      st.snap = mode === "play";
      keys.clear();
      if (mode !== "play" && st.near !== null) {
        st.near = null;
        onNear(null);
      }
    },
    setLook(phase, weather) {
      if (st.phase === phase && st.weather === weather) return;
      st.phase = phase;
      st.weather = weather;
      applyPhase();
    },
    setEnabled(v) {
      st.enabled = v;
      if (!v) keys.clear();
    },
    start() {
      if (st.running) return;
      st.running = true;
      last = performance.now();
      resize();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      st.running = false;
      cancelAnimationFrame(raf);
      keys.clear();
    },
    get near() { return st.near; },
    get position() { return { x: st.x, z: st.z, heading: st.heading }; },
    // for tests and demos
    teleport(x, z, heading) {
      st.x = x;
      st.z = z;
      if (heading != null) st.heading = heading;
      st.y = heightAt(x, z);
      st.snap = true;
    },
    renderOnce() {
      resize();
      step(0.016);
      renderer.render(scene, camera);
      drawMinimap();
    },
  };
  api.respawn();
  return api;
}
