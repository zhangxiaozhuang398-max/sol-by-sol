// The walkable 3D Mars surface.
//
// Each "place" (the base, a survey site, Perseverance's landing site) is its own
// small scene at close to human scale:
//  - the ground is a REAL orbital photo of that spot (MRO HiRISE / CTX mosaic
//    from NASA Mars Trek, tinted; see scripts/build_scenes.mjs). A fine gravel
//    grain is blended in up close, because one photo pixel is about 30 cm.
//  - the skyline is the REAL terrain seen from that spot, computed from MOLA
//    elevations: the crater rim rises exactly as many degrees as it would there.
//  - the habitat, rover, vehicle, dish and astronaut are NASA's own 3D models
//    (NASA 3D Resources). The solar array, greenhouse, flags and rocks are built
//    in code here.
//  - the sky follows the real Mars: butterscotch by day, stars only at night.
//
// This module only draws and moves things. Game rules stay in game.js; the UI
// (main.js) says which place to show and which targets exist, and reacts when
// the player walks up to one.

import * as THREE from "three";
import { GLTFLoader } from "./vendor/loaders/GLTFLoader.js";
import { DRACOLoader } from "./vendor/loaders/DRACOLoader.js";

const WALK_SPEED = 7.5; // metres per second (a brisk, bounding walk)
const TURN_SPEED = 2.3;
const PLAY_RADIUS = 150; // metres from the centre of the place
const CAM_BACK = 7.2;
const CAM_UP = 2.9;
const SKY_R = 2600; // distance of the skyline mesh
const M_PER_DEG = (2 * Math.PI * 3396190) / 360;

// NASA models: file and how big to draw them. `rot` turns the model so that its
// front faces south (+z) before the scene's own rotation is applied.
const MODELS = {
  astronaut: { file: "astronaut.glb", height: 1.9, rot: 0 },
  habitat: { file: "habitat_1.glb", length: 9.5, rot: 0 },
  dish: { file: "dish_dish.glb", height: 7.2, rot: 0 },
  sev: { file: "sev.glb", length: 5.4, rot: 0, lazy: true },
  perseverance: { file: "perseverance.glb", length: 3.1, rot: 0, lazy: true },
};

// sky + light for each phase of the sol (colours are sRGB hex)
const LOOKS = {
  briefing: { horizon: 0xf0b890, zenith: 0xb78a70, sunEl: 13, sunAz: 95, sun: 0xffd2a6, sunI: 2.0, amb: 1.25, ground: 0xfff0e2, stars: 0, glow: 0xffd9b0 },
  day: { horizon: 0xe8c8a4, zenith: 0xc39a76, sunEl: 52, sunAz: 165, sun: 0xfff3e2, sunI: 2.6, amb: 1.5, ground: 0xffffff, stars: 0, glow: 0xfff0d8 },
  night: { horizon: 0x1b2036, zenith: 0x04050c, sunEl: -8, sunAz: 265, sun: 0x8fa2ff, sunI: 0.22, amb: 0.42, ground: 0x4a5072, stars: 1, glow: 0x3d5f9e },
};
LOOKS.settle = LOOKS.night;
const WEATHER = {
  sunny: { fog: [350, 9000], haze: 0, dim: 1 },
  hazy: { fog: [90, 2600], haze: 0.45, dim: 0.8 },
  dust: { fog: [18, 230], haze: 0.92, dim: 0.5 },
};
const HAZE_COLOR = 0xb9865c;

const srgb = (hex) => new THREE.Color(hex);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- small procedural pieces (built in code, not NASA models) ----------
function grainTexture() {
  // Fine gravel grain, average 50% grey so that "2 × ground × grain" leaves the
  // photo's brightness unchanged from far away.
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const c = cv.getContext("2d");
  const img = c.createImageData(S, S);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const coarse = Array.from({ length: 32 * 32 }, rnd);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const fx = (x / S) * 32, fy = (y / S) * 32;
      const x0 = Math.floor(fx) % 32, y0 = Math.floor(fy) % 32, x1 = (x0 + 1) % 32, y1 = (y0 + 1) % 32;
      const ax = fx - Math.floor(fx), ay = fy - Math.floor(fy);
      const blob = (coarse[y0 * 32 + x0] * (1 - ax) + coarse[y0 * 32 + x1] * ax) * (1 - ay) + (coarse[y1 * 32 + x0] * (1 - ax) + coarse[y1 * 32 + x1] * ax) * ay;
      let v = 0.5 + (blob - 0.5) * 0.35 + (rnd() - 0.5) * 0.42;
      if (rnd() < 0.012) v -= 0.3; // pebbles
      if (rnd() < 0.006) v += 0.25;
      const g = clamp(v, 0, 1) * 255;
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color: srgb(color), roughness: 0.7, metalness: 0.1, ...opts });
function part(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function makeSolarArray() {
  const g = new THREE.Group();
  const cell = mat(0x2d5bb8, { roughness: 0.32, metalness: 0.35, emissive: srgb(0x0a1f4d), emissiveIntensity: 0.35 });
  const frame = mat(0xb9bcc6, { roughness: 0.5, metalness: 0.6 });
  for (let r = 0; r < 3; r++) {
    const row = new THREE.Group();
    const panel = part(new THREE.BoxGeometry(9, 0.08, 2.6), cell, 0, 1.55, 0);
    const rim = part(new THREE.BoxGeometry(9.2, 0.05, 2.8), frame, 0, 1.5, 0);
    panel.rotation.x = rim.rotation.x = 0.5; // tilted toward the sun (south)
    row.add(panel, rim);
    for (let i = 1; i < 6; i++) { // cell lines
      const line = part(new THREE.BoxGeometry(0.04, 0.1, 2.6), frame, -4.5 + i * 1.5, 1.56, 0);
      line.rotation.x = 0.5;
      line.castShadow = false;
      row.add(line);
    }
    for (const x of [-3.6, 0, 3.6]) {
      row.add(part(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 8), frame, x, 0.8, 0.2));
      row.add(part(new THREE.BoxGeometry(0.5, 0.08, 1.6), frame, x, 0.05, 0.2));
    }
    row.position.z = (r - 1) * 4.2;
    g.add(row);
  }
  g.add(part(new THREE.BoxGeometry(0.9, 1.0, 0.7), mat(0xe9e4f5), -5.6, 0.5, 0)); // junction box
  return g;
}

function makeGreenhouse() {
  const g = new THREE.Group();
  const L = 11, R = 2.4;
  const skin = new THREE.MeshStandardMaterial({ color: srgb(0xdff6e8), transparent: true, opacity: 0.38, roughness: 0.15, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 28, 1, true, 0, Math.PI), skin);
  tunnel.rotation.z = Math.PI / 2;
  tunnel.rotation.y = Math.PI / 2;
  g.add(tunnel);
  const rib = mat(0xe9e4f5, { roughness: 0.5 });
  for (let i = 0; i <= 6; i++) {
    const ring = part(new THREE.TorusGeometry(R, 0.07, 8, 24, Math.PI), rib, -L / 2 + (i * L) / 6, 0, 0);
    ring.rotation.y = Math.PI / 2;
    g.add(ring);
  }
  g.add(part(new THREE.BoxGeometry(L, 0.25, R * 2), mat(0x5a4a3c, { roughness: 0.95 }), 0, 0.12, 0)); // floor
  const soil = mat(0x3a2a20, { roughness: 1 });
  const leaf = mat(0x3fae52, { roughness: 0.8 });
  const leaf2 = mat(0x7bd36a, { roughness: 0.8 });
  for (const z of [-1.1, 0, 1.1]) {
    g.add(part(new THREE.BoxGeometry(L - 1.4, 0.45, 0.7), soil, 0, 0.45, z));
    for (let i = 0; i < 12; i++) {
      const p = part(new THREE.SphereGeometry(0.26 + ((i * 7 + z * 3) % 3) * 0.05, 8, 6), i % 3 ? leaf : leaf2, -L / 2 + 1.2 + i * 0.78, 0.86, z);
      p.scale.y = 0.75;
      g.add(p);
    }
  }
  const cap = mat(0xd9d6e2, { roughness: 0.6 });
  for (const s of [-1, 1]) {
    const end = part(new THREE.CylinderGeometry(R, R, 0.18, 28, 1, false, 0, Math.PI), cap, (s * L) / 2, 0, 0);
    end.rotation.z = Math.PI / 2;
    end.rotation.y = Math.PI / 2;
    g.add(end);
  }
  g.add(part(new THREE.BoxGeometry(1.4, 2.1, 1.3), cap, L / 2 + 0.7, 1.05, 0)); // hatch
  return g;
}

function makeFlag(color = 0xf3b562) {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), mat(0xdddddd, { metalness: 0.6 }), 0, 1.3, 0));
  g.add(part(new THREE.BoxGeometry(0.9, 0.55, 0.03), mat(color, { emissive: srgb(color), emissiveIntensity: 0.25 }), 0.47, 2.3, 0));
  g.add(part(new THREE.BoxGeometry(0.7, 0.45, 0.5), mat(0xe9e4f5), 0.9, 0.23, 0.4)); // sample case
  return g;
}

function makeRoverPlaceholder() {
  const g = new THREE.Group();
  g.add(part(new THREE.BoxGeometry(2.4, 1.6, 4.4), mat(0x9aa3b5), 0, 1.5, 0));
  for (const x of [-1.3, 1.3]) for (const z of [-1.6, 0, 1.6]) {
    const w = part(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 14), mat(0x33303a), x, 0.5, z);
    w.rotation.z = Math.PI / 2;
    g.add(w);
  }
  return g;
}


// The player: a small procedural astronaut, so the limbs can actually move.
// NASA's astronaut model is a beautiful static scan in a T-pose, which reads as
// "broken" the moment it walks; this version is built from primitives and rigged
// with groups for a simple walk cycle.
function makeAstronaut() {
  const g = new THREE.Group();
  const suit = mat(0xf3f1ea, { roughness: 0.62, metalness: 0.04 });
  const trim = mat(0xe2622b, { roughness: 0.55, metalness: 0.1 });
  const dark = mat(0x2f3038, { roughness: 0.82, metalness: 0.1 });
  const boot = mat(0x44464f, { roughness: 0.9 });
  const visorMat = new THREE.MeshStandardMaterial({ color: srgb(0xffb347), metalness: 0.85, roughness: 0.18, emissive: srgb(0x2a1200), emissiveIntensity: 0.55 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: srgb(0xffd27a), emissiveIntensity: 2.2, roughness: 0.3 });

  // body: a slightly flattened capsule, with a chest control panel and belt
  const torso = part(new THREE.CapsuleGeometry(0.25, 0.45, 6, 14), suit, 0, 1.2, 0);
  torso.scale.z = 0.8;
  g.add(torso);
  g.add(part(new THREE.BoxGeometry(0.34, 0.1, 0.035), trim, 0, 1.31, 0.2));
  g.add(part(new THREE.BoxGeometry(0.18, 0.12, 0.025), dark, 0, 1.18, 0.205));
  const belt = part(new THREE.TorusGeometry(0.255, 0.035, 6, 20), trim, 0, 1.0, 0);
  belt.rotation.x = Math.PI / 2;
  g.add(belt);

  // life-support backpack
  g.add(part(new THREE.BoxGeometry(0.46, 0.55, 0.24), suit, 0, 1.22, -0.27));
  g.add(part(new THREE.BoxGeometry(0.3, 0.1, 0.02), trim, 0, 1.44, -0.4));
  g.add(part(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 10), dark, 0.17, 1.02, -0.27));

  // helmet and gold visor
  g.add(part(new THREE.SphereGeometry(0.24, 20, 16), suit, 0, 1.64, 0));
  const visor = part(new THREE.SphereGeometry(0.18, 20, 14), visorMat, 0, 1.65, 0.11);
  visor.scale.set(1, 0.82, 0.55);
  g.add(visor);
  g.add(part(new THREE.SphereGeometry(0.045, 8, 6), lampMat, 0, 1.79, 0.12));

  // shoulder / hip rings
  for (const x of [-0.31, 0.31]) {
    const ring = part(new THREE.TorusGeometry(0.095, 0.022, 6, 14), trim, x, 1.42, 0);
    ring.rotation.y = Math.PI / 2;
    g.add(ring);
  }

  // arms: pivot at the shoulder, so a single rotation swings the whole arm
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.31, 1.42, 0);
    pivot.add(part(new THREE.CapsuleGeometry(0.075, 0.24, 4, 10), suit, 0, -0.18, 0));
    const fore = part(new THREE.CapsuleGeometry(0.065, 0.22, 4, 10), suit, 0, -0.43, 0.02);
    fore.rotation.x = -0.14;
    pivot.add(fore);
    pivot.add(part(new THREE.SphereGeometry(0.072, 8, 6), dark, 0, -0.57, 0.035));
    g.add(pivot);
    return pivot;
  }
  const armL = makeArm(-1), armR = makeArm(1);

  // legs: same trick, hips with thigh + shin + boot
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.15, 0.86, 0);
    pivot.add(part(new THREE.CapsuleGeometry(0.105, 0.24, 4, 10), suit, 0, -0.2, 0));
    pivot.add(part(new THREE.CapsuleGeometry(0.09, 0.24, 4, 10), suit, 0, -0.55, 0));
    pivot.add(part(new THREE.BoxGeometry(0.17, 0.12, 0.3), boot, 0, -0.8, 0.06));
    g.add(pivot);
    return pivot;
  }
  const legL = makeLeg(-1), legR = makeLeg(1);

  g.userData = { armL, armR, legL, legR, torso };
  return g;
}

const BUILT = { panels: makeSolarArray, greenhouse: makeGreenhouse, flag: makeFlag };

function makeLabel(text, done) {
  const pad = 26;
  const font = '800 52px "Nunito", "PingFang SC", "Microsoft YaHei", sans-serif';
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = font;
  const w = Math.ceil(measure.measureText(text).width) + pad * 2;
  const h = 92;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d");
  c.fillStyle = done ? "rgba(31,77,61,0.92)" : "rgba(27,21,48,0.88)";
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
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, fog: false, sizeAttenuation: false }));
  sp.scale.set(w * 0.00048, h * 0.00048, 1); // constant size on screen
  sp.renderOrder = 20;
  return sp;
}

// ---------- the world ----------
export async function createWorld(opts) {
  const {
    mount, minimap, joystick, dataDir = "data/mars", modelDir = "assets/models",
    onNear = () => {}, onUse = () => {},
  } = opts;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch {
    return null; // no WebGL: the UI falls back to the simple map
  }
  let DATA;
  try {
    DATA = await fetch(`${dataDir}/scenes.json`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  } catch (err) {
    console.warn("Mars scenes failed to load", err);
    renderer.dispose();
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(srgb(LOOKS.day.horizon), 350, 9000);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.3, 14000);

  const hemi = new THREE.HemisphereLight(srgb(0xffe9d2), srgb(0x7a4a30), 1.5);
  const sun = new THREE.DirectionalLight(srgb(0xfff3e2), 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 320 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.05;
  scene.add(hemi, sun, sun.target);
  const lamp = new THREE.PointLight(srgb(0xffc98a), 0, 60, 1.6); // habitat lights at night
  scene.add(lamp);

  // ---- sky dome: gradient + sun, drawn behind everything ----
  const skyU = {
    horizon: { value: srgb(LOOKS.day.horizon) }, zenith: { value: srgb(LOOKS.day.zenith) },
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, glow: { value: srgb(LOOKS.day.glow) }, disc: { value: 1 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(12000, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 horizon; uniform vec3 zenith; uniform vec3 sunDir; uniform vec3 glow; uniform float disc; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 c = mix(horizon, zenith, pow(h, 0.5));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          c += glow * (pow(s, 900.0) * 3.0 * disc + pow(s, 18.0) * 0.28);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  const starPos = [];
  for (let i = 0; i < 1800; i++) {
    const a = Math.random() * Math.PI * 2, e = Math.asin(Math.random() * 0.98 + 0.02);
    starPos.push(Math.cos(a) * Math.cos(e) * 9000, Math.sin(e) * 9000, Math.sin(a) * Math.cos(e) * 9000);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, fog: false, transparent: true, opacity: 0, depthWrite: false }));
  stars.renderOrder = -9;
  stars.frustumCulled = false;
  scene.add(stars);

  // ---- ground ----
  const texLoader = new THREE.TextureLoader();
  const loadTex = (file) => new Promise((resolve, reject) => texLoader.load(`${dataDir}/${file}`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    resolve(t);
  }, undefined, reject));
  const groundMat = { near: new THREE.MeshBasicMaterial({ color: 0xffffff }), far: new THREE.MeshBasicMaterial({ color: 0xffffff }), plain: new THREE.MeshBasicMaterial({ color: srgb(0xa5764f) }) };
  const flat = (size, material, y) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    return m;
  };
  const plain = flat(60000, groundMat.plain, -0.3);
  const farGround = flat(3072, groundMat.far, -0.15);
  const nearGround = flat(384, groundMat.near, 0);
  // gravel grain: result = 2 × photo × grain (mid-grey grain leaves the photo unchanged)
  const grain = grainTexture();
  grain.repeat.set(384 / 3.2, 384 / 3.2);
  grain.anisotropy = maxAniso;
  const grainMesh = flat(384, new THREE.MeshBasicMaterial({
    map: grain, fog: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.SrcColorFactor,
  }), 0.01);
  grainMesh.renderOrder = 1;
  const shadowCatcher = flat(384, new THREE.ShadowMaterial({ opacity: 0.42 }), 0.02);
  shadowCatcher.receiveShadow = true;
  shadowCatcher.renderOrder = 2;
  scene.add(plain, farGround, nearGround, grainMesh, shadowCatcher);

  // ---- skyline (rebuilt per place) ----
  const skylineMat = new THREE.MeshBasicMaterial({ color: srgb(0x9a6a48), side: THREE.DoubleSide });
  let skyline = null;
  function buildSkyline(angles) {
    if (skyline) { scene.remove(skyline); skyline.geometry.dispose(); }
    const n = angles.length;
    const pos = [];
    const idx = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2; // 0 = north (−z), clockwise
      const x = Math.sin(a) * SKY_R, z = -Math.cos(a) * SKY_R;
      const top = Math.tan((angles[i % n] * Math.PI) / 180) * SKY_R;
      pos.push(x, -60, z, x, top, z);
      if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    skyline = new THREE.Mesh(geo, skylineMat);
    skyline.frustumCulled = false;
    scene.add(skyline);
  }

  // ---- rocks (decoration, seeded per place) ----
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: srgb(0x6e4630), roughness: 1, metalness: 0, flatShading: true });
  let rocks = null;
  function buildRocks(seed, avoid) {
    if (rocks) { scene.remove(rocks); rocks.dispose(); }
    let s = seed >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const N = 150;
    rocks = new THREE.InstancedMesh(rockGeo, rockMat, N);
    rocks.castShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      let x, z, tries = 0;
      do {
        const r = 6 + Math.sqrt(rnd()) * 170, a = rnd() * Math.PI * 2;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
      } while (avoid.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 2) && ++tries < 8);
      const size = 0.12 + rnd() * rnd() * 0.9;
      e.set(rnd() * 3, rnd() * 3, rnd() * 3);
      q.setFromEuler(e);
      sc.set(size * (0.7 + rnd() * 0.7), size * (0.45 + rnd() * 0.4), size * (0.7 + rnd() * 0.7));
      v.set(x, size * 0.18, z);
      m.compose(v, q, sc);
      rocks.setMatrixAt(i, m);
    }
    scene.add(rocks);
  }

  // ---- blowing dust (dust-storm sols) ----
  const DUST_N = 600;
  const dustArr = new Float32Array(DUST_N * 3);
  for (let i = 0; i < DUST_N * 3; i++) dustArr[i] = (Math.random() - 0.5) * 50;
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustArr, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: srgb(0xf0c08a), size: 0.12, transparent: true, opacity: 0.7, depthWrite: false }));
  dust.visible = false;
  dust.frustumCulled = false;
  scene.add(dust);

  // ---- NASA models ----
  const gltf = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(new URL("./vendor/draco/", import.meta.url).href);
  gltf.setDRACOLoader(draco);
  const modelCache = new Map();
  function loadModel(key) {
    if (modelCache.has(key)) return modelCache.get(key);
    const def = MODELS[key];
    const p = gltf.loadAsync(`${modelDir}/${def.file}`).then((g) => {
      const root = g.scene;
      root.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          // No environment map here: keep surfaces matte so the sun lights them,
          // and skip the costly glass (transmission) pass.
          if ("transmission" in m) m.transmission = 0;
          if ("metalness" in m) m.metalness = Math.min(m.metalness, 0.25);
          if ("roughness" in m) m.roughness = Math.max(m.roughness, 0.55);
          if ("clearcoat" in m) m.clearcoat = 0;
        }
      });
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      const k = def.height ? def.height / size.y : def.length / Math.max(size.x, size.z);
      root.position.set(-centre.x, -box.min.y, -centre.z);
      const fit = new THREE.Group();
      fit.add(root);
      fit.scale.setScalar(k);
      fit.rotation.y = def.rot || 0;
      const holder = new THREE.Group();
      holder.add(fit);
      holder.userData.size = size.multiplyScalar(k);
      return holder;
    });
    modelCache.set(key, p);
    return p;
  }

  // ---- player ----
  const player = new THREE.Group();
  const avatar = makeAstronaut();
  player.add(avatar);
  player.userData.rig = avatar.userData;
  scene.add(player);

  const st = {
    x: 0, z: 0, heading: Math.PI, moving: false, walkT: 0,
    spawn: { x: 0, z: 14, heading: Math.PI },
    mode: "cinematic", enabled: true, running: false,
    phase: "day", weather: "sunny", place: null,
    near: null, orbit: 0.6, time: 0, snap: true, sceneToken: 0,
  };
  // current (smoothed) look values
  const cur = {
    horizon: srgb(LOOKS.day.horizon), zenith: srgb(LOOKS.day.zenith), sun: srgb(LOOKS.day.sun), glow: srgb(LOOKS.day.glow),
    ground: srgb(0xffffff), sunDir: new THREE.Vector3(0.3, 0.8, 0.5).normalize(),
    sunI: 2.6, amb: 1.5, stars: 0, fogNear: 350, fogFar: 9000, disc: 1, lamp: 0,
  };
  const tgt = { horizon: new THREE.Color(), zenith: new THREE.Color(), sun: new THREE.Color(), glow: new THREE.Color(), ground: new THREE.Color(), sunDir: new THREE.Vector3() };
  const hazeC = srgb(HAZE_COLOR);

  function applyLook(dt) {
    const L = LOOKS[st.phase] || LOOKS.day;
    const Wd = WEATHER[st.weather] || WEATHER.sunny;
    const night = L.stars > 0;
    tgt.horizon.set(L.horizon);
    tgt.zenith.set(L.zenith);
    if (!night) { tgt.horizon.lerp(hazeC, Wd.haze * 0.75); tgt.zenith.lerp(hazeC, Wd.haze); }
    else if (Wd.haze > 0.5) { tgt.horizon.multiplyScalar(0.6); tgt.zenith.lerp(tgt.horizon, 0.6); }
    tgt.sun.set(L.sun);
    tgt.glow.set(L.glow);
    tgt.ground.set(L.ground).multiplyScalar(night ? 1 : 0.55 + 0.45 * Wd.dim);
    const el = (L.sunEl * Math.PI) / 180, az = (L.sunAz * Math.PI) / 180;
    tgt.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    const k = dt >= 1 ? 1 : Math.min(1, dt * 1.6);
    cur.horizon.lerp(tgt.horizon, k);
    cur.zenith.lerp(tgt.zenith, k);
    cur.sun.lerp(tgt.sun, k);
    cur.glow.lerp(tgt.glow, k);
    cur.ground.lerp(tgt.ground, k);
    cur.sunDir.lerp(tgt.sunDir, k).normalize();
    const mix = (a, b) => a + (b - a) * k;
    cur.sunI = mix(cur.sunI, L.sunI * Wd.dim);
    cur.amb = mix(cur.amb, L.amb * (0.6 + 0.4 * Wd.dim));
    cur.stars = mix(cur.stars, L.stars * (1 - Wd.haze));
    cur.fogNear = mix(cur.fogNear, Wd.fog[0]);
    cur.fogFar = mix(cur.fogFar, Wd.fog[1]);
    cur.disc = mix(cur.disc, night ? 0 : 1 - Wd.haze * 0.8);
    cur.lamp = mix(cur.lamp, night ? 220 : 0);

    skyU.horizon.value.copy(cur.horizon);
    skyU.zenith.value.copy(cur.zenith);
    skyU.glow.value.copy(cur.glow);
    skyU.disc.value = cur.disc;
    skyU.sunDir.value.copy(cur.sunDir);
    scene.fog.color.copy(cur.horizon);
    scene.fog.near = cur.fogNear;
    scene.fog.far = cur.fogFar;
    hemi.intensity = cur.amb;
    hemi.color.copy(cur.horizon).lerp(srgb(0xffffff), 0.5);
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunI;
    sun.castShadow = cur.sunI > 0.5;
    shadowCatcher.material.opacity = 0.42 * clamp((cur.sunI - 0.4) / 1.6, 0, 1);
    stars.material.opacity = cur.stars;
    stars.visible = cur.stars > 0.01;
    for (const m of [groundMat.near, groundMat.far]) m.color.copy(cur.ground);
    groundMat.plain.color.set(0xa5764f).multiply(cur.ground);
    skylineMat.color.set(0x9a6a48).multiply(cur.ground);
    lamp.intensity = cur.lamp;
    dust.visible = st.weather === "dust";
  }

  // ---- targets and objects of the current place ----
  let targets = [];
  let solids = [];
  let targetKey = "";
  const objects = new THREE.Group();
  scene.add(objects);
  const decor = new THREE.Group();
  scene.add(decor);
  const pulses = [];

  function setTargets(list) {
    const key = JSON.stringify(list.map((t) => [t.id, t.label, t.done, t.x, t.z, t.model, t.rot]));
    if (key === targetKey) return;
    targetKey = key;
    objects.traverse((o) => { if (o.isSprite) { o.material.map.dispose(); o.material.dispose(); } });
    objects.clear();
    pulses.length = 0;
    targets = list;
    solids = [];
    const token = st.sceneToken;
    for (const t of list) {
      const ox = t.mx ?? t.x, oz = t.mz ?? t.z;
      if (t.solid) solids.push({ x: ox, z: oz, r: t.solid });
      if (t.model) {
        const holder = new THREE.Group();
        holder.position.set(ox, 0, oz);
        holder.rotation.y = t.rot || 0;
        objects.add(holder);
        if (BUILT[t.model]) holder.add(BUILT[t.model](t.color));
        else if (MODELS[t.model]) {
          const placeholder = MODELS[t.model].lazy ? makeRoverPlaceholder() : null;
          if (placeholder) holder.add(placeholder);
          loadModel(t.model).then((m) => {
            if (token !== st.sceneToken && !holder.parent) return;
            if (placeholder) holder.remove(placeholder);
            holder.add(m.clone(true));
          }).catch((e) => console.warn(`model ${t.model}`, e));
        }
      }
      if (t.kind === "habitat") lamp.position.set(t.x, 3.2, t.z);
      // ring on the ground where the player has to stand
      const color = t.done ? 0x7ad67a : t.kind === "site" ? 0xff8a55 : 0xf3b562;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(t.r * 0.86, t.r * 0.94, 48),
        new THREE.MeshBasicMaterial({ color: srgb(color), transparent: true, opacity: 0.7, fog: false, depthWrite: false, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(t.x, 0.06, t.z);
      ring.renderOrder = 3;
      objects.add(ring);
      pulses.push(ring);
      const label = makeLabel(t.label, t.done);
      label.position.set(ox, t.labelY || 4, oz);
      objects.add(label);
    }
  }

  // ---- places ----
  const texCache = new Map();
  const tex = (file) => {
    if (!texCache.has(file)) texCache.set(file, loadTex(file));
    return texCache.get(file);
  };
  let mapImg = null; // near photo, for the minimap

  // Small, non-interactive props that make the base feel lived in. They are
  // deliberately not targets: the four stations are the only things with rules.
  function buildDecor(id) {
    decor.clear();
    if (id !== "base") return;
    const flag1 = makeFlag(0xf3b562);
    flag1.position.set(-4.6, 0, 5.8);
    flag1.rotation.y = 0.35;
    decor.add(flag1);
    const flag2 = makeFlag(0x4fd1c5);
    flag2.position.set(4.8, 0, 6.2);
    flag2.rotation.y = -0.45;
    decor.add(flag2);
    for (const [x, z, size, color, ry] of [[-3.2, 4.0, 0.55, 0x9a6a48, 0.3], [3.0, 3.6, 0.45, 0x6e5a4a, -0.2], [3.5, 4.2, 0.35, 0x8a6a50, 0.5]]) {
      const crate = part(new THREE.BoxGeometry(size, size, size), mat(color, { roughness: 0.92 }), x, size / 2, z);
      crate.rotation.y = ry;
      decor.add(crate);
    }
  }

  async function setScene(id) {
    const P = DATA.places[id];
    if (!P) throw new Error(`unknown place ${id}`);
    if (st.place === id) return;
    const token = ++st.sceneToken;
    const [near, far] = await Promise.all([tex(P.near.file), tex(P.far.file)]);
    if (token !== st.sceneToken) return; // a newer request won
    st.place = id;
    groundMat.near.map = near;
    groundMat.far.map = far;
    groundMat.near.needsUpdate = groundMat.far.needsUpdate = true;
    mapImg = near.image;
    buildSkyline(P.skyline);
    buildDecor(id);
    targetKey = ""; // objects are rebuilt by the next setTargets()
    let seed = 7;
    for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    st.rockSeed = seed;
    st.snap = true;
  }

  // ---- input ----
  const keys = new Set();
  const joy = { x: 0, y: 0 };
  const MOVE_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"];
  const canControl = () => st.mode === "play" && st.enabled && st.running && !document.querySelector("dialog[open]");
  const typing = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");

  window.addEventListener("keydown", (e) => {
    if (!canControl() || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (MOVE_KEYS.includes(e.code)) {
      keys.add(e.code);
      e.preventDefault();
    } else if (e.code === "KeyE" || ((e.code === "Space" || e.code === "Enter") && e.target.tagName !== "BUTTON")) {
      e.preventDefault();
      if (!e.repeat) onUse();
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  // drag on the view to look around
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

  // ---- simulation ----
  const camPos = new THREE.Vector3(0, 6, 20);
  const camLook = new THREE.Vector3();

  function step(dt) {
    st.time += dt;
    if (st.mode === "play") {
      let fwd = 0, turn = 0;
      if (canControl()) {
        if (keys.has("ArrowUp") || keys.has("KeyW")) fwd += 1;
        if (keys.has("ArrowDown") || keys.has("KeyS")) fwd -= 0.6;
        if (keys.has("ArrowLeft") || keys.has("KeyA")) turn += 1;
        if (keys.has("ArrowRight") || keys.has("KeyD")) turn -= 1;
        if (Math.abs(joy.y) > 0.15) fwd += -joy.y * (joy.y < 0 ? 1 : 0.6);
        if (Math.abs(joy.x) > 0.2) turn += -joy.x;
      }
      fwd = clamp(fwd, -0.6, 1);
      turn = clamp(turn, -1, 1);
      st.heading += turn * TURN_SPEED * dt;
      const slow = st.weather === "dust" ? 0.8 : 1;
      // heading h: forward = (sin h, cos h) with x east and z south
      let nx = st.x + Math.sin(st.heading) * fwd * WALK_SPEED * slow * dt;
      let nz = st.z + Math.cos(st.heading) * fwd * WALK_SPEED * slow * dt;
      const d0 = Math.hypot(nx, nz);
      if (d0 > PLAY_RADIUS) { nx *= PLAY_RADIUS / d0; nz *= PLAY_RADIUS / d0; }
      for (const s of solids) {
        const dx = nx - s.x, dz = nz - s.z;
        const d = Math.hypot(dx, dz);
        if (d < s.r && d > 0.0001) { nx = s.x + (dx / d) * s.r; nz = s.z + (dz / d) * s.r; }
      }
      st.x = nx;
      st.z = nz;
      st.moving = Math.abs(fwd) > 0.05;
      if (st.moving) st.walkT += dt * 9 * Math.abs(fwd);
    } else {
      st.moving = false;
      st.orbit += dt * 0.07;
    }

    // astronaut: Mars gravity is 38% of Earth's, so the walk is a slow bound
    const phase = st.walkT;
    const hop = st.moving ? Math.abs(Math.sin(phase)) * 0.14 : 0;
    player.position.set(st.x, hop, st.z);
    player.rotation.y = st.heading;
    player.rotation.z = st.moving ? Math.sin(phase) * 0.035 : 0;
    player.visible = st.mode === "play";
    const rig = player.userData.rig;
    if (rig) {
      const swing = st.moving ? Math.sin(phase) * 0.58 : 0;
      const k = Math.min(1, dt * 12);
      rig.armL.rotation.x += (swing - rig.armL.rotation.x) * k;
      rig.armR.rotation.x += (-swing - rig.armR.rotation.x) * k;
      rig.legL.rotation.x += (-swing * 0.9 - rig.legL.rotation.x) * k;
      rig.legR.rotation.x += (swing * 0.9 - rig.legR.rotation.x) * k;
      rig.armL.rotation.z = 0.07;
      rig.armR.rotation.z = -0.07;
      avatar.rotation.x += ((st.moving ? 0.055 : 0) - avatar.rotation.x) * k;
    }

    // camera
    let cx, cy, cz, lx, ly, lz;
    if (st.mode === "play") {
      cx = st.x - Math.sin(st.heading) * CAM_BACK;
      cz = st.z - Math.cos(st.heading) * CAM_BACK;
      cy = CAM_UP;
      lx = st.x + Math.sin(st.heading) * 6;
      ly = 1.5;
      lz = st.z + Math.cos(st.heading) * 6;
    } else {
      // slow orbit around the place, looking a little up so the sky shows
      const r = 30;
      cx = Math.sin(st.orbit) * r;
      cz = Math.cos(st.orbit) * r + 2;
      cy = 5.5;
      lx = 0;
      ly = 3.2;
      lz = 0;
    }
    const k = st.snap ? 1 : Math.min(1, dt * 6);
    st.snap = false;
    camPos.set(camPos.x + (cx - camPos.x) * k, camPos.y + (cy - camPos.y) * k, camPos.z + (cz - camPos.z) * k);
    camLook.set(camLook.x + (lx - camLook.x) * k, camLook.y + (ly - camLook.y) * k, camLook.z + (lz - camLook.z) * k);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    sky.position.copy(camPos);
    stars.position.copy(camPos);

    // sun shadow follows the player
    const fx = st.mode === "play" ? st.x : 0, fz = st.mode === "play" ? st.z : 0;
    sun.target.position.set(fx, 0, fz);
    sun.position.set(fx + cur.sunDir.x * 150, Math.max(20, cur.sunDir.y * 150), fz + cur.sunDir.z * 150);

    applyLook(dt);

    const pulse = 0.55 + 0.25 * Math.sin(st.time * 3);
    for (const r of pulses) r.material.opacity = pulse;

    if (dust.visible) {
      const arr = dustGeo.attributes.position.array;
      for (let i = 0; i < DUST_N; i++) {
        arr[i * 3] += dt * 14;
        arr[i * 3 + 1] += dt * 0.8;
        if (arr[i * 3] > 25) arr[i * 3] = -25;
        if (arr[i * 3 + 1] > 12) arr[i * 3 + 1] = 0;
      }
      dustGeo.attributes.position.needsUpdate = true;
      dust.position.set(camPos.x, 0.5, camPos.z);
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
    if (!minimap || !mapImg || minimap.offsetParent === null) return;
    const c = minimap.getContext("2d");
    const S = minimap.width;
    const half = 110; // metres shown each side of the centre
    const src = mapImg.width / 384; // photo pixels per metre
    c.imageSmoothingEnabled = true;
    c.drawImage(mapImg, (192 - half) * src, (192 - half) * src, half * 2 * src, half * 2 * src, 0, 0, S, S);
    const k = S / (half * 2);
    const px = (m) => (m + half) * k;
    for (const t of targets) {
      const x = px(t.mx ?? t.x), y = px(t.mz ?? t.z);
      c.beginPath();
      c.arc(x, y, t.kind === "habitat" ? 6 : 5, 0, Math.PI * 2);
      c.fillStyle = t.done ? "#7ad67a" : t.kind === "site" ? "#ff8a55" : t.kind === "habitat" ? "#ffffff" : "#f3b562";
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = "#1b1530";
      c.stroke();
    }
    c.save();
    c.translate(px(st.x), px(st.z));
    c.rotate(-st.heading);
    c.beginPath();
    c.moveTo(0, 9);
    c.lineTo(5.5, -6);
    c.lineTo(0, -2.5);
    c.lineTo(-5.5, -6);
    c.closePath();
    c.fillStyle = "#ff5d73";
    c.strokeStyle = "#ffffff";
    c.lineWidth = 1.5;
    c.fill();
    c.stroke();
    c.restore();
  }

  // ---- loop + sizing ----
  function resize() {
    const w = mount.clientWidth, h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 72 : 58; // wider on tall phone screens
    camera.updateProjectionMatrix();
    if (st.running) renderer.render(scene, camera);
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
    kind: "3d",
    places: DATA.places,
    setScene,
    get place() { return st.place; },
    setTargets(list) {
      setTargets(list);
      if (st.rockSeed != null && st.rocksFor !== targetKey) {
        st.rocksFor = targetKey;
        buildRocks(st.rockSeed, [...solids, ...targets.map((t) => ({ x: t.x, z: t.z, r: t.r }))]);
      }
    },
    setSpawn(x, z, heading = Math.PI) {
      st.spawn = { x, z, heading };
    },
    respawn() {
      st.x = st.spawn.x;
      st.z = st.spawn.z;
      st.heading = st.spawn.heading;
      st.near = null;
      st.snap = true;
      keys.clear();
    },
    setMode(mode) {
      if (st.mode === mode) return;
      st.mode = mode;
      st.snap = true;
      keys.clear();
      if (mode !== "play" && st.near !== null) {
        st.near = null;
        onNear(null);
      }
    },
    setLook(phase, weather) {
      st.phase = phase;
      st.weather = weather;
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
    // Where the astronaut really is on Mars (the place's real coordinates plus
    // the metres walked), and the MOLA elevation of the place.
    get location() {
      const P = DATA.places[st.place];
      if (!P) return null;
      return {
        lat: P.lat - st.z / M_PER_DEG,
        lon: P.lon + st.x / (M_PER_DEG * Math.cos((P.lat * Math.PI) / 180)),
        elevation: P.elevation,
      };
    },
    // for tests and demos
    teleport(x, z, heading) {
      st.x = x;
      st.z = z;
      if (heading != null) st.heading = heading;
      st.snap = true;
    },
    renderOnce(dt = 0.016) {
      resize();
      step(dt);
      renderer.render(scene, camera);
      drawMinimap();
    },
    settle() { // jump straight to the target look (tests)
      applyLook(1);
    },
  };
  applyLook(1);
  api.respawn();
  return api;
}
